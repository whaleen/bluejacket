import { ENDPOINTS, HEADERS, REFERERS } from './endpoints.js';
import { getCookieHeader } from '../auth/playwright.js';
import { getSupabase, getLocationConfig } from '../db/supabase.js';
import type { SyncResult } from '../types/index.js';
import pdfParse from 'pdf-parse';

type InboundHistoryRow = {
  lineId: number;
  shipmentNumber: string;
  mpOrgCode: string;
  vendorId: string;
  wtsStopSeqno: string;
  schdArrivalDate: string;
  schdArrivalTime: string;
  truckNumber: string;
  scac: string;
};

type ReceivingReportHeader = {
  inboundShipmentNo: string | null;
  scac: string | null;
  truckNumber: string | null;
  scheduledArrivalDate: string | null;
  scheduledArrivalTime: string | null;
  actualArrivalTime: string | null;
  totalUnits: number | null;
  totalPcUnits: number | null;
  sealNumber: string | null;
};

type ReceivingReportItem = {
  lineIndex: number;
  inboundShipmentNo: string | null;
  cso: string | null;
  trackingNumber: string | null;
  model: string | null;
  serial: string | null;
  inboundReplacement: string | null;
  qty: number | null;
  rcvd: number | null;
  short: number | null;
  damage: number | null;
  serialMix: string | null;
  rawLine: string;
};

type PdfTextItem = {
  str?: string;
  transform?: number[];
};

function formatDateForInbound(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

function extractHiddenInputs(html: string): Record<string, string> {
  const inputs: Record<string, string> = {};
  const regex = /(name|id)=['"]([^'"]+)['"][^>]*value=['"]([^'"]*)['"]/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const key = match[2];
    inputs[key] = match[3];
  }
  return inputs;
}

function parseInboundHistory(html: string): { rows: InboundHistoryRow[]; totalRows: number; inputs: Record<string, string> } {
  const inputs = extractHiddenInputs(html);
  const lineIdSet = new Set<number>();

  for (const key of Object.keys(inputs)) {
    const match = key.match(/_(\d+)(?:_\d+)?$/);
    if (match) {
      const lineId = Number.parseInt(match[1], 10);
      if (Number.isFinite(lineId)) {
        lineIdSet.add(lineId);
      }
    }
  }

  const lineIds = Array.from(lineIdSet).sort((a, b) => a - b);
  const rows: InboundHistoryRow[] = [];

  for (const lineId of lineIds) {
    const eachRowShipmentList = Number.parseInt(inputs[`eachRowShipmentList_${lineId}`] || '0', 10);
    let inboundShipmentNo = '';
    for (let shipmentIndex = 0; shipmentIndex <= eachRowShipmentList; shipmentIndex += 1) {
      const key = `shipmentNum_${lineId}_${shipmentIndex}`;
      if (inputs[key]) inboundShipmentNo = inputs[key];
    }
    if (!inboundShipmentNo) {
      inboundShipmentNo = inputs[`shipmentNum_${lineId}`] || '';
    }
    if (!inboundShipmentNo) continue;

    rows.push({
      lineId,
      shipmentNumber: inboundShipmentNo,
      mpOrgCode: inputs[`mpOrgCode_${lineId}`] || inputs.selMpOrgCodeVal || '',
      vendorId: inputs[`vendorId_${lineId}`] || inputs.selVendorIdVal || '',
      wtsStopSeqno: inputs[`wtsStopSeqno_${lineId}`] || inputs.selWtsStopSeqnoVal || '',
      schdArrivalDate: inputs[`schdArrivalDate_${lineId}`] || inputs.selSchdArrivalDateVal || '',
      schdArrivalTime: inputs[`schdArrivalTime_${lineId}`] || inputs.selSchdArrivalTimeVal || '',
      truckNumber: inputs[`truckNumber_${lineId}`] || inputs.selTruckNumberVal || '',
      scac: inputs[`scac_${lineId}`] || inputs.selScacVal || '',
    });
  }

  return { rows, totalRows: lineIds.length, inputs };
}

function parseReceivingReport(text: string): { header: ReceivingReportHeader; items: ReceivingReportItem[] } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const shipmentMatch = text.match(/\b([A-Z]\d{7}-\d)\b/);
  const inboundShipmentNo = shipmentMatch ? shipmentMatch[1] : null;
  let headerLine: string | null = null;

  if (inboundShipmentNo) {
    headerLine = lines.find((line) => line.includes(inboundShipmentNo)) ?? null;
  }

  let scac: string | null = null;
  let truckNumber: string | null = null;
  let scheduledArrivalDate: string | null = null;
  let scheduledArrivalTime: string | null = null;
  let actualArrivalTime: string | null = null;
  let totalUnits: number | null = null;

  if (headerLine) {
    const tokens = headerLine.split(/\s+/);
    const dateIndex = tokens.findIndex((token) => /\d{2}-\d{2}-\d{4}/.test(token));
    if (dateIndex >= 0) {
      scac = tokens[0] ?? null;
      truckNumber = tokens[1] ?? null;
      scheduledArrivalDate = tokens[dateIndex] ?? null;
      scheduledArrivalTime = tokens[dateIndex + 1] ?? null;
      const totalUnitsToken = tokens[dateIndex + 2];
      if (totalUnitsToken && /^\d+$/.test(totalUnitsToken)) {
        totalUnits = Number.parseInt(totalUnitsToken, 10);
      }
      if (tokens.includes(inboundShipmentNo ?? '')) {
        actualArrivalTime = null;
      }
    }
  }

  const header: ReceivingReportHeader = {
    inboundShipmentNo,
    scac,
    truckNumber,
    scheduledArrivalDate,
    scheduledArrivalTime,
    actualArrivalTime,
    totalUnits,
    totalPcUnits: null,
    sealNumber: null,
  };

  const shipmentPattern = /^[A-Z]\d{7}-\d/;
  const rowLines: string[] = [];
  let currentRow = '';

  for (const line of lines) {
    if (line.startsWith('Inbound Shipment')) continue;
    if (shipmentPattern.test(line)) {
      if (currentRow) {
        rowLines.push(currentRow.trim());
      }
      currentRow = line;
    } else if (currentRow) {
      currentRow = `${currentRow} ${line}`;
    }
  }
  if (currentRow) rowLines.push(currentRow.trim());

  const items: ReceivingReportItem[] = [];
  let lineIndex = 0;

  for (const row of rowLines) {
    const tokens = row.split(/\s+/).filter(Boolean);
    if (tokens.length < 4) continue;
    const shipmentNo = tokens[0];
    const cso = tokens[1] ?? null;
    const numericIndexes = tokens
      .map((token, index) => (/^\d+$/.test(token) ? index : -1))
      .filter((index) => index >= 0);
    const qtyIndex = numericIndexes.length > 0 ? numericIndexes[numericIndexes.length - 1] : -1;
    const qtyToken = qtyIndex >= 0 ? tokens[qtyIndex] : null;
    const qty = qtyToken && /^\d+$/.test(qtyToken) ? Number.parseInt(qtyToken, 10) : null;

    const serialIndex = qtyIndex > 2 ? qtyIndex - 1 : 3;
    const modelIndex = serialIndex - 1;

    const model = tokens[modelIndex] ?? null;
    const serialToken = tokens[serialIndex] ?? null;
    const serial = serialToken && !/^\d+$/.test(serialToken) ? serialToken : null;

    const trackingTokens = tokens.slice(2, modelIndex);
    const trackingNumber = trackingTokens.length > 0 ? trackingTokens.join(' ') : null;

    items.push({
      lineIndex,
      inboundShipmentNo: shipmentNo,
      cso,
      trackingNumber,
      model,
      serial,
      inboundReplacement: null,
      qty,
      rcvd: null,
      short: null,
      damage: null,
      serialMix: null,
      rawLine: row,
    });
    lineIndex += 1;
  }

  return { header, items };
}

function groupTextItemsByLine(items: PdfTextItem[]) {
  const lines = new Map<number, PdfTextItem[]>();
  for (const item of items) {
    const text = item.str?.trim();
    if (!text) continue;
    const y = item.transform?.[5];
    if (typeof y !== 'number') continue;
    const key = Math.round(y * 10) / 10;
    const current = lines.get(key) ?? [];
    current.push(item);
    lines.set(key, current);
  }

  const sorted = Array.from(lines.entries()).sort((a, b) => b[0] - a[0]);
  return sorted.map((entry) =>
    entry[1].sort((a, b) => (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0))
  );
}

function parseReceivingReportFromLayout(pages: PdfTextItem[][]): { header: ReceivingReportHeader; items: ReceivingReportItem[] } {
  const allItems = pages.flat();
  const lines = groupTextItemsByLine(allItems);
  const headerLineIndex = lines.findIndex((line) => {
    const text = line.map((item) => item.str).join(' ').toLowerCase();
    return text.includes('inbound') && text.includes('shipment') && text.includes('cso') && text.includes('model');
  });

  const header: ReceivingReportHeader = {
    inboundShipmentNo: null,
    scac: null,
    truckNumber: null,
    scheduledArrivalDate: null,
    scheduledArrivalTime: null,
    actualArrivalTime: null,
    totalUnits: null,
    totalPcUnits: null,
    sealNumber: null,
  };

  if (headerLineIndex < 0) {
    return { header, items: [] };
  }

  const headerLine = lines[headerLineIndex];
  const headerColumns = headerLine.map((item) => ({
    text: item.str?.trim() ?? '',
    x: item.transform?.[4] ?? 0,
  }));
  const columnNames = [
    'Inbound Shipment No',
    'CSO',
    'Tracking #',
    'Model',
    'Serial',
    'Inbound Replacement',
    'Qty',
    'RCVD',
    'Short',
    'Damage',
    'Serial Mix',
  ];

  const columnPositions = columnNames.map((name) => {
    const tokens = name.split(' ');
    const match = headerColumns.find((col) => tokens.every((token) => col.text.includes(token)));
    return {
      name,
      x: match?.x ?? 0,
    };
  }).sort((a, b) => a.x - b.x);

  const boundaries = columnPositions.map((col, index) => {
    const next = columnPositions[index + 1];
    return {
      name: col.name,
      start: col.x - 1,
      end: next ? (col.x + next.x) / 2 : Number.POSITIVE_INFINITY,
    };
  });

  const items: ReceivingReportItem[] = [];
  let lineIndex = 0;

  for (let i = headerLineIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    const firstText = line[0]?.str?.trim() ?? '';
    if (!firstText) continue;
    if (!/^[A-Z]\d{7}-\d/.test(firstText)) continue;

    const columns: Record<string, string> = {};
    for (const item of line) {
      const text = item.str?.trim() ?? '';
      if (!text) continue;
      const x = item.transform?.[4] ?? 0;
      const boundary = boundaries.find((b) => x >= b.start && x < b.end);
      if (!boundary) continue;
      const key = boundary.name;
      columns[key] = columns[key] ? `${columns[key]} ${text}` : text;
    }

    const qty = columns['Qty'] && /^\d+$/.test(columns['Qty']) ? Number.parseInt(columns['Qty'], 10) : null;
    const rcvd = columns['RCVD'] && /^\d+$/.test(columns['RCVD']) ? Number.parseInt(columns['RCVD'], 10) : null;
    const short = columns['Short'] && /^\d+$/.test(columns['Short']) ? Number.parseInt(columns['Short'], 10) : null;
    const damage = columns['Damage'] && /^\d+$/.test(columns['Damage']) ? Number.parseInt(columns['Damage'], 10) : null;

    items.push({
      lineIndex,
      inboundShipmentNo: columns['Inbound Shipment No'] ?? null,
      cso: columns['CSO'] ?? null,
      trackingNumber: columns['Tracking #'] ?? null,
      model: columns['Model'] ?? null,
      serial: columns['Serial'] ?? null,
      inboundReplacement: columns['Inbound Replacement'] ?? null,
      qty,
      rcvd,
      short,
      damage,
      serialMix: columns['Serial Mix'] ?? null,
      rawLine: line.map((item) => item.str).join(' '),
    });
    lineIndex += 1;
  }

  return { header, items };
}

async function fetchInboundHtml(
  source: 'summary' | 'history',
  dmsLoc: string,
  daysBeforeDate: string,
  cookieHeader: string
) {
  await fetch(ENDPOINTS.INBOUND_BASE, {
    method: 'GET',
    headers: {
      ...HEADERS,
      Referer: REFERERS.INBOUND,
      Cookie: cookieHeader,
    },
  });

  const body = new URLSearchParams({
    dmsLoc,
    daysBeforeDate,
    rowsContaining: '',
    selectedSubTab: source === 'summary' ? '1' : '3',
    showLateTruckNotify: '',
    hDmsLoc: '',
    hDmsLocVal: '',
    reportType: 'AGENT',
    userType: 'AGENT',
    rowRecNo: '0',
    rowInsideRecNo: '',
  }).toString();

  const response = await fetch(source === 'summary' ? ENDPOINTS.INBOUND_SUMMARY : ENDPOINTS.INBOUND_HISTORY, {
    method: 'POST',
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Referer: REFERERS.INBOUND,
      Cookie: cookieHeader,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch inbound ${source}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function fetchInboundReportPdf(
  row: InboundHistoryRow,
  inputs: Record<string, string>,
  cookieHeader: string
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(inputs)) {
    params.append(key, value);
  }

  params.set('selectedSubTab', '3');
  params.set('rowRecNo', String(row.lineId));
  params.set('rowInsideRecNo', '');
  params.set('selMpOrgCodeVal', row.mpOrgCode);
  params.set('selVendorIdVal', row.vendorId);
  params.set('selShipmentNumVal', row.shipmentNumber);
  params.set('selWtsStopSeqnoVal', row.wtsStopSeqno);
  params.set('selSchdArrivalDateVal', row.schdArrivalDate);
  params.set('selSchdArrivalTimeVal', row.schdArrivalTime);
  params.set('selTruckNumberVal', row.truckNumber);
  params.set('selScacVal', row.scac);

  const body = params.toString();

  const response = await fetch(ENDPOINTS.INBOUND_EXPORT_PDF, {
    method: 'POST',
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Referer: REFERERS.INBOUND,
      Cookie: cookieHeader,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch inbound report PDF: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!contentType.includes('pdf') || buffer.length === 0) {
    const preview = buffer.toString('utf-8', 0, 200);
    throw new Error(`Inbound report response not PDF. content-type=${contentType} preview=${preview}`);
  }
  return buffer;
}

export async function syncInboundReceipts(locationId: string): Promise<SyncResult> {
  const log: string[] = [];
  const startTime = Date.now();

  try {
    const db = getSupabase();
    const config = await getLocationConfig(locationId);
    const dmsLoc = process.env.INBOUND_DMS_LOC ?? '19SU';
    const source = (process.env.INBOUND_SOURCE ?? 'history') as 'summary' | 'history';
    const daysBeforeDate = formatDateForInbound(new Date());
    log.push('Starting inbound receipts sync');
    log.push(`Company ${config.companyId} • Location ${locationId}`);
    log.push(`DMS location code: ${dmsLoc}`);
    log.push(`Inbound source: ${source}`);

    const cookieHeader = await getCookieHeader(locationId);
    const inboundHtml = await fetchInboundHtml(source, dmsLoc, daysBeforeDate, cookieHeader);
    log.push(`Inbound HTML length: ${inboundHtml.length}`);
    log.push(`Inbound HTML contains table: ${inboundHtml.includes('tbl_list_inboundHistory')}`);
    const parsed = parseInboundHistory(inboundHtml);
    const rows = parsed.rows;
    const maxShipments = Number.parseInt(process.env.INBOUND_MAX_SHIPMENTS || String(rows.length), 10);
    const rowsToProcess = rows.slice(0, Math.max(1, maxShipments));
    log.push(`Inbound rows (totRowRec=${parsed.totalRows}): ${rows.length}`);
    log.push(`Processing ${rowsToProcess.length} shipment(s)`);

    if (rows.length === 0) {
      return {
        success: true,
        stats: {
          totalGEItems: 0,
          itemsInLoads: 0,
          unassignedItems: 0,
          newItems: 0,
          updatedItems: 0,
          forSaleLoads: 0,
          pickedLoads: 0,
          changesLogged: 0,
        },
        duration: Date.now() - startTime,
        log,
      };
    }

    const { data: existingReceipts } = await db
      .from('inbound_receipts')
      .select('inbound_shipment_no')
      .eq('company_id', config.companyId)
      .eq('location_id', locationId);

    const existingShipmentSet = new Set(
      (existingReceipts ?? [])
        .map((row) => row.inbound_shipment_no)
        .filter(Boolean)
    );

    let receiptsProcessed = 0;
    let itemsInserted = 0;
    let receiptsSkipped = 0;

    for (const row of rowsToProcess) {
      if (existingShipmentSet.has(row.shipmentNumber)) {
        receiptsSkipped += 1;
        continue;
      }
      const pdfBuffer = await fetchInboundReportPdf(row, parsed.inputs, cookieHeader);
      let pdfResult;
      const pages: PdfTextItem[][] = [];
      try {
        pdfResult = await pdfParse(pdfBuffer, {
          pagerender: (pageData: { getTextContent: () => Promise<{ items: PdfTextItem[] }> }) =>
            pageData.getTextContent().then((textContent: { items: PdfTextItem[] }) => {
              pages.push(textContent.items);
              return '';
            }),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.push(`PDF parse failed for ${row.shipmentNumber}: ${message}`);
        continue;
      }
      const { header, items } = parseReceivingReportFromLayout(pages);
      const fallback = items.length === 0 ? parseReceivingReport(pdfResult.text) : null;
      const finalItems = items.length > 0 ? items : fallback?.items ?? [];
      const finalHeader = items.length > 0 ? header : fallback?.header ?? header;

      const inboundShipmentNo = finalHeader.inboundShipmentNo ?? row.shipmentNumber;
      const receiptPayload = {
        company_id: config.companyId,
        location_id: locationId,
        inbound_shipment_no: inboundShipmentNo,
        scac: finalHeader.scac ?? row.scac,
        truck_number: finalHeader.truckNumber ?? row.truckNumber,
        scheduled_arrival_date: finalHeader.scheduledArrivalDate ?? row.schdArrivalDate,
        scheduled_arrival_time: finalHeader.scheduledArrivalTime ?? row.schdArrivalTime,
        actual_arrival_time: finalHeader.actualArrivalTime,
        total_units: finalHeader.totalUnits,
        total_pc_units: finalHeader.totalPcUnits,
        seal_number: finalHeader.sealNumber,
        updated_at: new Date().toISOString(),
      };

      const { error: receiptError } = await db
        .from('inbound_receipts')
        .upsert(receiptPayload, { onConflict: 'company_id,location_id,inbound_shipment_no' });

      if (receiptError) {
        throw new Error(`Failed to upsert inbound receipt: ${receiptError.message}`);
      }

      const itemPayload = finalItems.map((item) => ({
        company_id: config.companyId,
        location_id: locationId,
        inbound_shipment_no: inboundShipmentNo,
        line_index: item.lineIndex,
        cso: item.cso,
        tracking_number: item.trackingNumber,
        model: item.model,
        serial: item.serial,
        inbound_replacement: item.inboundReplacement,
        qty: item.qty,
        rcvd: item.rcvd,
        short: item.short,
        damage: item.damage,
        serial_mix: item.serialMix,
        raw_line: item.rawLine,
      }));

      if (itemPayload.length > 0) {
        const { error: itemsError } = await db
          .from('inbound_receipt_items')
          .insert(itemPayload);
        if (itemsError) {
          throw new Error(`Failed to insert inbound receipt items: ${itemsError.message}`);
        }
      }

      receiptsProcessed += 1;
      itemsInserted += itemPayload.length;
    }

    log.push(`Receipts processed: ${receiptsProcessed}`);
    log.push(`Receipts skipped (already imported): ${receiptsSkipped}`);
    log.push(`Items inserted: ${itemsInserted}`);

    return {
      success: true,
      stats: {
        totalGEItems: itemsInserted,
        itemsInLoads: 0,
        unassignedItems: 0,
        newItems: itemsInserted,
        updatedItems: 0,
        forSaleLoads: 0,
        pickedLoads: 0,
        changesLogged: 0,
      },
      duration: Date.now() - startTime,
      log,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.push(`Error: ${message}`);
    return {
      success: false,
      error: message,
      duration: Date.now() - startTime,
      stats: {
        totalGEItems: 0,
        itemsInLoads: 0,
        unassignedItems: 0,
        newItems: 0,
        updatedItems: 0,
        forSaleLoads: 0,
        pickedLoads: 0,
        changesLogged: 0,
      },
      log,
    };
  }
}
