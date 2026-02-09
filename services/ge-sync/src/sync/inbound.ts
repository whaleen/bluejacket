import { ENDPOINTS, HEADERS, REFERERS } from './endpoints.js';
import { getCookieHeader } from '../auth/playwright.js';
import { getSupabase, getLocationConfig } from '../db/supabase.js';
import type { SyncResult } from '../types/index.js';


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
  summaryUnits: number | null;
  summaryPoints: number | null;
};

type InboundAsnResult = {
  headers: string[];
  rows: string[][];
};

function formatDateForInbound(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

function normalizeInboundShipmentNo(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/[A-Z]\d{7}/);
  if (match) return match[0];
  return trimmed.split(/\s*-\s*/)[0] ?? trimmed;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripHtml(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSelectedOptions(html: string): Record<string, string> {
  const selections: Record<string, string> = {};
  const selectRegex = /<select[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/select>/gi;
  let match: RegExpExecArray | null;
  while ((match = selectRegex.exec(html)) !== null) {
    const name = match[1];
    const optionsHtml = match[2];
    const selectedMatch = optionsHtml.match(/<option[^>]*selected[^>]*>([\s\S]*?)<\/option>/i)
      || optionsHtml.match(/<option[^>]*selected[^>]*value=["']([^"']*)["'][^>]*>([\s\S]*?)<\/option>/i);

    if (selectedMatch) {
      const valueMatch = selectedMatch[0].match(/value=["']([^"']*)["']/i);
      const value = valueMatch ? valueMatch[1] : stripHtml(selectedMatch[1] ?? '');
      if (value) selections[name] = value;
      continue;
    }

    const firstOption = optionsHtml.match(/<option[^>]*>([\s\S]*?)<\/option>/i);
    if (firstOption) {
      const valueMatch = firstOption[0].match(/value=["']([^"']*)["']/i);
      const value = valueMatch ? valueMatch[1] : stripHtml(firstOption[1] ?? '');
      if (value) selections[name] = value;
    }
  }
  return selections;
}

type SelectOption = { value: string; label: string; selected: boolean };

function extractSelectOptions(html: string): Record<string, SelectOption[]> {
  const optionsByName: Record<string, SelectOption[]> = {};
  const selectRegex = /<select[^>]*name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/select>/gi;
  let match: RegExpExecArray | null;

  while ((match = selectRegex.exec(html)) !== null) {
    const name = match[1];
    const optionsHtml = match[2];
    const optionMatches = optionsHtml.match(/<option[\s\S]*?<\/option>/gi) ?? [];
    const options = optionMatches.map((optionHtml) => {
      const valueMatch = optionHtml.match(/value=["']([^"']*)["']/i);
      const value = valueMatch ? valueMatch[1] : stripHtml(optionHtml);
      const labelMatch = optionHtml.match(/<option[^>]*>([\s\S]*?)<\/option>/i);
      const label = labelMatch ? stripHtml(labelMatch[1]) : stripHtml(optionHtml);
      const selected = /selected/i.test(optionHtml);
      return { value, label, selected };
    });
    optionsByName[name] = options;
  }

  return optionsByName;
}

function extractFormDefaults(html: string): Record<string, string> {
  return {
    ...extractHiddenInputs(html),
    ...extractSelectedOptions(html),
  };
}

function parseHtmlTable(tableHtml: string): InboundAsnResult {
  const rows: string[][] = [];
  let headers: string[] = [];
  const rowMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];

  for (const rowHtml of rowMatches) {
    const cellMatches = rowHtml.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) ?? [];
    if (cellMatches.length === 0) continue;
    const cells = cellMatches.map((cell) => stripHtml(cell));
    const isHeaderRow = /<th/i.test(rowHtml);

    if (isHeaderRow && headers.length === 0) {
      headers = cells;
      continue;
    }

    if (headers.length === 0) {
      headers = cells;
      continue;
    }

    const normalized = cells.join(' ').toLowerCase();
    if (normalized.includes('no rows were found')) {
      continue;
    }

    rows.push(cells);
  }

  return { headers, rows };
}

function parseInboundAsnTable(html: string): InboundAsnResult {
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  for (const tableHtml of tables) {
    const parsed = parseHtmlTable(tableHtml);
    const headerText = parsed.headers.join(' ').toLowerCase();
    if (headerText.includes('erp shipment')) {
      return parsed;
    }
  }

  return { headers: [], rows: [] };
}

function parseInboundSummaryTable(html: string): Map<string, { units: number | null; points: number | null }> {
  const tableMatch = html.match(/<table[^>]*id=["']tb_list_inboundSummary["'][\s\S]*?<\/table>/i);
  if (!tableMatch) return new Map();

  const parsed = parseHtmlTable(tableMatch[0]);
  const headerIndex = (name: string) =>
    parsed.headers.findIndex((header) => header.toLowerCase().includes(name));

  const shipmentIndex = headerIndex('inbound shipment');
  const unitsIndex = headerIndex('units');
  const pointsIndex = headerIndex('points');

  const summaryMap = new Map<string, { units: number | null; points: number | null }>();
  if (shipmentIndex < 0) return summaryMap;

  for (const row of parsed.rows) {
    const shipmentCell = row[shipmentIndex] ?? '';
    const shipmentNumber = normalizeInboundShipmentNo(shipmentCell);
    if (!shipmentNumber) continue;
    const unitsRaw = unitsIndex >= 0 ? row[unitsIndex] ?? '' : '';
    const pointsRaw = pointsIndex >= 0 ? row[pointsIndex] ?? '' : '';
    const units = /^\d+$/.test(unitsRaw) ? Number.parseInt(unitsRaw, 10) : null;
    const points = /^\d+$/.test(pointsRaw) ? Number.parseInt(pointsRaw, 10) : null;
    if (!summaryMap.has(shipmentNumber)) {
      summaryMap.set(shipmentNumber, { units, points });
    }
  }

  return summaryMap;
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
  const summaryMap = parseInboundSummaryTable(html);
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

    const summary = summaryMap.get(normalizeInboundShipmentNo(inboundShipmentNo));

    rows.push({
      lineId,
      shipmentNumber: normalizeInboundShipmentNo(inboundShipmentNo),
      mpOrgCode: inputs[`mpOrgCode_${lineId}`] || inputs.selMpOrgCodeVal || '',
      vendorId: inputs[`vendorId_${lineId}`] || inputs.selVendorIdVal || '',
      wtsStopSeqno: inputs[`wtsStopSeqno_${lineId}`] || inputs.selWtsStopSeqnoVal || '',
      schdArrivalDate: inputs[`schdArrivalDate_${lineId}`] || inputs.selSchdArrivalDateVal || '',
      schdArrivalTime: inputs[`schdArrivalTime_${lineId}`] || inputs.selSchdArrivalTimeVal || '',
      truckNumber: inputs[`truckNumber_${lineId}`] || inputs.selTruckNumberVal || '',
      scac: inputs[`scac_${lineId}`] || inputs.selScacVal || '',
      summaryUnits: summary?.units ?? null,
      summaryPoints: summary?.points ?? null,
    });
  }

  return { rows, totalRows: lineIds.length, inputs };
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



async function fetchInboundAsnHtml(
  shipmentNumber: string,
  dmsLoc: string,
  cookieHeader: string,
  overrides: Record<string, string> = {}
) {
  const asnPage = await fetch(ENDPOINTS.INBOUND_ASN, {
    method: 'GET',
    headers: {
      ...HEADERS,
      Referer: REFERERS.INBOUND,
      Cookie: cookieHeader,
    },
  });

  const asnHtml = await asnPage.text();
  const defaults = extractFormDefaults(asnHtml);
  const selectOptions = extractSelectOptions(asnHtml);

  const body = new URLSearchParams({
    ...defaults,
    erpShipment: normalizeInboundShipmentNo(shipmentNumber),
    cso: '',
    trackingNum: '',
    serial: '',
    hExcelView: '',
    dmsLoc: defaults.dmsLoc || dmsLoc,
    ...overrides,
  }).toString();

  const response = await fetch(ENDPOINTS.INBOUND_ASN_SEARCH, {
    method: 'POST',
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Referer: REFERERS.INBOUND_ASN,
      Cookie: cookieHeader,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch inbound ASN ${shipmentNumber}: ${response.status} ${response.statusText}`);
  }

  return { html: await response.text(), defaults, selectOptions };
}

export async function syncInboundReceipts(locationId: string): Promise<SyncResult> {
  const log: string[] = [];
  const startTime = Date.now();

  try {
    const db = getSupabase();
    const config = await getLocationConfig(locationId);
    const dmsLoc = process.env.INBOUND_DMS_LOC ?? '19SU';
    const source = (process.env.INBOUND_SOURCE ?? 'summary') as 'summary' | 'history';
    const daysBeforeDate = formatDateForInbound(new Date());
    log.push('Starting inbound receipts sync');
    log.push(`Company ${config.companyId} • Location ${locationId}`);
    log.push(`DMS location code: ${dmsLoc}`);
    log.push(`Inbound source: ${source}`);
    log.push('Inbound target date: all');

    const cookieHeader = await getCookieHeader(locationId);
    const inboundHtml = await fetchInboundHtml(source, dmsLoc, daysBeforeDate, cookieHeader);
    log.push(`Inbound HTML length: ${inboundHtml.length}`);
    log.push(`Inbound HTML contains table: ${inboundHtml.includes('tbl_list_inboundHistory')}`);
    const parsed = parseInboundHistory(inboundHtml);
    const rows = parsed.rows;
    const rowsToProcess = rows;
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
    const forceReimport = process.env.INBOUND_FORCE_REIMPORT === 'true';
    if (forceReimport) {
      log.push('Force reimport enabled: existing inbound receipts will be reprocessed');
    }

    let receiptsProcessed = 0;
    let itemsInserted = 0;
    let receiptsSkipped = 0;

    for (const row of rowsToProcess) {
      if (!forceReimport && existingShipmentSet.has(row.shipmentNumber)) {
        receiptsSkipped += 1;
        continue;
      }
      const asnResponse = await fetchInboundAsnHtml(row.shipmentNumber, dmsLoc, cookieHeader);
      let asnTable = parseInboundAsnTable(asnResponse.html);
      let asnTypeLabel = 'default';

      if (row.summaryUnits !== null && asnTable.rows.length < row.summaryUnits) {
        const optionsEntries = Object.entries(asnResponse.selectOptions);
        const typeEntry = optionsEntries.find(([, options]) =>
          options.some((option) => option.label.toLowerCase() === 'ge' || option.value.toLowerCase() === 'ge')
        );

        if (typeEntry) {
          const [typeName, options] = typeEntry;
          const current = options.find((option) => option.selected) ?? options[0];
          const optionValues = options
            .map((option) => option.value)
            .filter((value) => value && value !== current?.value);

          if (optionValues.length > 0) {
            log.push(`ASN type options for ${row.shipmentNumber} (${typeName}): ${options.map((option) => option.value).join(', ')}`);
          }

          for (const optionValue of optionValues) {
            const altResponse = await fetchInboundAsnHtml(row.shipmentNumber, dmsLoc, cookieHeader, {
              [typeName]: optionValue,
            });
            const altTable = parseInboundAsnTable(altResponse.html);
            log.push(`ASN rows for ${row.shipmentNumber} using ${typeName}=${optionValue}: ${altTable.rows.length}`);
            if (altTable.rows.length > asnTable.rows.length) {
              asnTable = altTable;
              asnTypeLabel = `${typeName}=${optionValue}`;
            }
          }
        }
      }
      if (asnTable.headers.length === 0) {
        log.push(`Inbound ASN table missing for ${row.shipmentNumber}`);
        continue;
      }

      const headerIndex = (name: string) =>
        asnTable.headers.findIndex((header) => header.toLowerCase().includes(name));

      const csoIndex = headerIndex('cso');
      const trackingIndex = headerIndex('tracking');
      const trackingStatusIndex = headerIndex('tracking # status');
      const modelIndex = headerIndex('model');
      const serialIndex = headerIndex('serial');

      const unitsLabel = row.summaryUnits !== null ? String(row.summaryUnits) : 'n/a';
      const asnRowCount = asnTable.rows.length;
      const unitsGap = row.summaryUnits !== null ? Math.max(0, row.summaryUnits - asnRowCount) : null;
      const gapLabel = unitsGap !== null ? String(unitsGap) : 'n/a';
      log.push(`ASN rows for ${row.shipmentNumber}: ${asnRowCount} (summary units: ${unitsLabel}, gap: ${gapLabel}, type: ${asnTypeLabel})`);
      log.push(`ASN headers for ${row.shipmentNumber}: ${asnTable.headers.join(' | ')}`);
      if (asnTable.rows.length > 0) {
        log.push(`ASN raw row ${row.shipmentNumber}: ${asnTable.rows[0].join(' | ')}`);
      }
      if (asnTable.rows.length > 0) {
        const sample = asnTable.rows[0];
        const sampleCso = csoIndex >= 0 ? sample[csoIndex] ?? '' : '';
        const sampleTracking = trackingIndex >= 0 ? sample[trackingIndex] ?? '' : '';
        const sampleModel = modelIndex >= 0 ? sample[modelIndex] ?? '' : '';
        const sampleSerial = serialIndex >= 0 ? sample[serialIndex] ?? '' : '';
        log.push(
          `ASN sample ${row.shipmentNumber}: CSO=${sampleCso || 'n/a'} • Tracking=${sampleTracking || 'n/a'} • Model=${sampleModel || 'n/a'} • Serial=${sampleSerial || 'n/a'}`
        );
      }

      const inboundShipmentNo = row.shipmentNumber;
      const summaryUnits = row.summaryUnits;
      const summaryPoints = row.summaryPoints;
      const receiptPayload = {
        company_id: config.companyId,
        location_id: locationId,
        inbound_shipment_no: inboundShipmentNo,
        scac: row.scac,
        truck_number: row.truckNumber,
        scheduled_arrival_date: row.schdArrivalDate,
        scheduled_arrival_time: row.schdArrivalTime,
        actual_arrival_time: null,
        total_units: null,
        total_pc_units: null,
        seal_number: null,
        summary_units: summaryUnits,
        summary_points: summaryPoints,
        asn_row_count: asnRowCount,
        units_gap: unitsGap,
        updated_at: new Date().toISOString(),
      };

      const { error: receiptError } = await db
        .from('inbound_receipts')
        .upsert(receiptPayload, { onConflict: 'company_id,location_id,inbound_shipment_no' });

      if (receiptError) {
        throw new Error(`Failed to upsert inbound receipt: ${receiptError.message}`);
      }

      if (forceReimport) {
        const { error: deleteError } = await db
          .from('inbound_receipt_items')
          .delete()
          .eq('company_id', config.companyId)
          .eq('location_id', locationId)
          .eq('inbound_shipment_no', inboundShipmentNo);
        if (deleteError) {
          throw new Error(`Failed to clear inbound receipt items: ${deleteError.message}`);
        }
      }

      const itemPayload = asnTable.rows.map((cells, index) => ({
        company_id: config.companyId,
        location_id: locationId,
        inbound_shipment_no: inboundShipmentNo,
        line_index: index,
        cso: csoIndex >= 0 ? cells[csoIndex] ?? null : null,
        tracking_number: trackingIndex >= 0 ? cells[trackingIndex] ?? null : null,
        model: modelIndex >= 0 ? cells[modelIndex] ?? null : null,
        serial: serialIndex >= 0 ? cells[serialIndex] ?? null : null,
        inbound_replacement: null,
        qty: trackingStatusIndex >= 0 && /^\d+$/.test(cells[trackingStatusIndex] ?? '')
          ? Number.parseInt(cells[trackingStatusIndex] ?? '0', 10)
          : null,
        rcvd: null,
        short: null,
        damage: null,
        serial_mix: null,
        raw_line: cells.join(' | '),
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
