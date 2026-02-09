import { getCookieHeader, getValidCookies } from '../auth/playwright.js';
import { getSupabase, getLocationConfig, updateSyncTimestamp } from '../db/supabase.js';
import { GE_DMS_BASE, HEADERS } from './endpoints.js';
import type { SyncResult } from '../types/index.js';
import { chromium } from 'playwright';

type OrderDataResponse = {
  order?: OrderDataOrder[];
};

type OrderDataFilters = {
  cso?: string;
  shipment?: string;
  tracking?: string;
};

type OrderDataOrder = {
  location?: string;
  cso?: string;
  order_type?: string;
  order_date?: string;
  customer_name?: string;
  customer_account?: string;
  customer_phone?: string;
  freight_terms?: string;
  shipping_instructions?: string;
  shipping_method?: string;
  additional_service?: string;
  points?: string;
  delivery?: OrderDataDelivery[];
};

type OrderDataDelivery = {
  delivery_id?: string;
  delivery_status?: string;
  cso_type?: string;
  customer_po_number?: string;
  rap?: string;
  zip_group?: string;
  delivery_date?: string;
  delivery_name?: string;
  delivery_address_1?: string;
  delivery_address_2?: string;
  delivery_city?: string;
  delivery_state?: string;
  delivery_zip?: string;
  delivery_phone?: { phone_number?: string }[];
  last_updated_date?: string;
  product?: OrderDataProduct[];
  service?: OrderDataService[];
};

type OrderDataProduct = {
  vendor?: string;
  shipment_number?: string;
  ship_date?: string;
  customer_tracking_number?: string;
  line?: OrderDataLine[];
};

type OrderDataService = {
  customer_tracking_number?: string;
  line?: OrderDataServiceLine[];
};

type OrderDataLine = {
  line_number?: string;
  line_status?: string;
  model_accessory?: {
    crated_indicator?: string;
    item_type?: string;
    item?: string;
    product_type?: string;
    anti_tip_indicator?: string;
    product_weight?: string;
    nmfc?: string;
    carton_code?: string;
    quantity?: string;
    points?: string;
    assigned_serials?: { serial?: string }[];
  };
};

type OrderDataServiceLine = {
  line_number?: string;
  line_status?: string;
  item?: string;
  quantity?: string;
};

const ORDERDATA_BASE = `${GE_DMS_BASE}/dms/orderdata`;
const ORDERDATA_JSON = `${GE_DMS_BASE}/dms/orderdata/downloadjson`;

const toText = (value: unknown) => (value == null ? '' : String(value).trim());

const toNumber = (value: unknown) => {
  const raw = toText(value);
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isNaN(parsed) ? null : parsed;
};

const chunkArray = <T>(items: T[], size: number) => {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const toInteger = (value: unknown) => {
  const raw = toText(value);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseDate = (value?: string) => {
  const raw = toText(value);
  if (!raw) return null;
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }
  return null;
};

const parseTimestamp = (value?: string) => {
  const raw = toText(value);
  if (!raw) return null;
  const normalized = raw.replace(/\s+/g, ' ').trim();
  if (/(AM|PM)$/i.test(normalized)) {
    const match = normalized.match(/^(\d{8}) (\d{1,2}):(\d{2}):(\d{2}) (AM|PM)$/i);
    if (match) {
      const [, datePart, hourRaw, minute, second, meridiem] = match;
      let hour = Number.parseInt(hourRaw, 10);
      if (Number.isNaN(hour)) return null;
      const isPm = meridiem.toUpperCase() === 'PM';
      if (hour === 12) {
        hour = isPm ? 12 : 0;
      } else if (isPm) {
        hour += 12;
      }
      return `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}T${String(hour).padStart(2, '0')}:${minute}:${second}Z`;
    }
  }
  if (/^\d{8} \d{2}:\d{2}:\d{2}/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(9)}Z`;
  }
  return null;
};

const formatDateForOrderData = (date: Date) => {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
};

const parseMmDdYyyy = (value: string) => {
  const [mm, dd, yyyy] = value.split('-').map((part) => Number.parseInt(part, 10));
  if (!mm || !dd || !yyyy) return null;
  return new Date(yyyy, mm - 1, dd);
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

async function fetchOrderDataHtmlViaPlaywright(
  locationId: string,
  dmsLoc: string,
  startDate: string,
  days: number
) {
  const cookies = await getValidCookies(locationId);
  const headless = process.env.PLAYWRIGHT_HEADLESS !== 'false';
  const browser = await chromium.launch({
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      viewport: { width: 1400, height: 900 },
    });

    await context.addCookies(cookies);
    const page = await context.newPage();
    await page.goto(ORDERDATA_BASE, { waitUntil: 'networkidle' });

    if (page.url().includes('sso') || page.url().includes('login')) {
      throw new Error('Order data page redirected to SSO login');
    }

    await page.waitForTimeout(1000);

    await page.selectOption('#cbDmsLoc', { value: dmsLoc }).catch(() => {});
    await page.fill('#orderDate', startDate).catch(() => {});
    await page.fill('#numberOfDays', String(days)).catch(() => {});

    await page.check('input[name="radShowOrders"][value="ALL"]').catch(() => {});
    await page.check('input[name="radShowStatus"][value="ALL"]').catch(() => {});

    await page.click('#dms_search_button');
    await page.waitForTimeout(2000);
    await page.waitForSelector('#table_list', { timeout: 10000 }).catch(() => {});

    return await page.content();
  } finally {
    await browser.close();
  }
}

function extractInputs(html: string): Record<string, string> {
  const inputs: Record<string, string> = {};
  const regex = /<input[^>]*name=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const name = match[1];
    const valueMatch = match[0].match(/value=["']([^"']*)["']/i);
    const value = valueMatch ? valueMatch[1] : '';
    inputs[name] = value;
  }
  return inputs;
}

function extractSelectedOption(html: string, selectName: string): string | null {
  const selectRegex = new RegExp(`<select[^>]*name=["']${selectName}["'][^>]*>[\\s\\S]*?<\\/select>`, 'i');
  const match = html.match(selectRegex);
  if (!match) return null;
  const selectBody = match[0];
  const selected = selectBody.match(/<option[^>]*selected[^>]*value=["']([^"']*)["'][^>]*>/i)
    || selectBody.match(/<option[^>]*selected[^>]*>([\s\S]*?)<\/option>/i);
  if (selected) {
    return selected[1] ? selected[1] : toText(selected[0]);
  }
  const first = selectBody.match(/<option[^>]*value=["']([^"']*)["'][^>]*>/i)
    || selectBody.match(/<option[^>]*>([\s\S]*?)<\/option>/i);
  return first ? (first[1] ? first[1] : toText(first[0])) : null;
}

function extractRadioSelection(html: string, inputName: string): { radioValue: string | null; hiddenValue: string | null } {
  const regex = new RegExp(`<input[^>]*type=["']radio["'][^>]*name=["']${inputName}["'][^>]*>`, 'gi');
  const matches = html.match(regex) ?? [];
  for (const input of matches) {
    if (!/checked/i.test(input)) continue;
    const onClickMatch = input.match(/ClickShow\w+\(["']([^"']+)["']\)/i);
    const valueMatch = input.match(/value=["']([^"']+)["']/i);
    return {
      radioValue: valueMatch ? valueMatch[1] : null,
      hiddenValue: onClickMatch ? onClickMatch[1] : null,
    };
  }
  return { radioValue: null, hiddenValue: null };
}

function parseHtmlTable(html: string, tableId: string) {
  const tableRegex = new RegExp(`<table[^>]*id=["']${tableId}["'][\\s\\S]*?<\\/table>`, 'i');
  const tableMatch = html.match(tableRegex);
  if (!tableMatch) return { headers: [], rows: [] as string[][] };

  const tableHtml = tableMatch[0];
  const rowMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  const rows: string[][] = [];
  let headers: string[] = [];

  for (const rowHtml of rowMatches) {
    const cellMatches = rowHtml.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) ?? [];
    if (cellMatches.length === 0) continue;
    const cells = cellMatches.map((cell) => toText(cell.replace(/<[^>]*>/g, ' ')));
    const isHeaderRow = /<th/i.test(rowHtml);
    if (isHeaderRow && headers.length === 0) {
      headers = cells;
      continue;
    }
    if (headers.length === 0) {
      headers = cells;
      continue;
    }
    rows.push(cells);
  }

  return { headers, rows };
}

function extractOrderRows(html: string) {
  const orderRows: { cso: string }[] = [];
  const orderNumberRegex = /id=["']orderNumber(\d+)["'][^>]*value=["']([^"']+)["']/gi;
  for (const match of html.matchAll(orderNumberRegex)) {
    const cso = toText(match[2]);
    if (cso) orderRows.push({ cso });
  }
  return orderRows;
}

async function fetchOrderDataJson(
  cookieHeader: string,
  dmsLoc: string,
  startDate: string,
  days: number,
  filters: OrderDataFilters = {}
) {
  const orderPage = await fetch(ORDERDATA_BASE, {
    method: 'GET',
    headers: {
      ...HEADERS,
      Referer: ORDERDATA_BASE,
      Cookie: cookieHeader,
    },
  });

  if (!orderPage.ok) {
    const snippet = (await orderPage.text().catch(() => '')).trim().slice(0, 200);
    throw new Error(`Order data page failed: ${orderPage.status} ${orderPage.statusText}. ${snippet}`);
  }

  const orderHtml = await orderPage.text();
  const inputs = extractInputs(orderHtml);
  const showOrdersSelection = extractRadioSelection(orderHtml, 'radShowOrders');
  const showStatusSelection = extractRadioSelection(orderHtml, 'radShowStatus');
  const showOrdersHidden = showOrdersSelection.hiddenValue || 'a';
  const showStatusHidden = showStatusSelection.hiddenValue || 'a';
  const showOrdersRadio = showOrdersSelection.radioValue || 'ALL';
  const showStatusRadio = showStatusSelection.radioValue || 'ALL';
  const jsonVersion = extractSelectedOption(orderHtml, 'jsonDataVersion') || 'V2';

  const body = new URLSearchParams({
    ...inputs,
    cbDmsLoc: dmsLoc,
    radShowOrders: showOrdersRadio,
    radShowStatus: showStatusRadio,
    txtOrderDate: startDate,
    txtNumberOfDays: String(days),
    hDmsLoc: dmsLoc,
    hShowOrders: showOrdersHidden,
    hShowStatus: showStatusHidden,
    hDeliveryDate: startDate,
    hNumberOfDays: String(days),
    hCso: filters.cso ?? '',
    htrackingNumber: filters.tracking ?? '',
    hShipment: filters.shipment ?? '',
    txtOrderCSO: filters.cso ?? '',
    trackingNumber: filters.tracking ?? '',
    txtOrdrShipment: filters.shipment ?? '',
    orderCSO: filters.cso ?? '',
    hCsvView: '',
    hExportType: '',
    jsonDataVersion: jsonVersion,
  }).toString();

  const response = await fetch(ORDERDATA_JSON, {
    method: 'POST',
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Referer: ORDERDATA_BASE,
      Cookie: cookieHeader,
    },
    body,
  });

  if (!response.ok) {
    const snippet = (await response.text().catch(() => '')).trim().slice(0, 200);
    throw new Error(`Order data JSON failed: ${response.status} ${response.statusText}. ${snippet}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  return { text, status: response.status, contentType };
}

async function fetchOrderDataHtml(
  cookieHeader: string,
  dmsLoc: string,
  startDate: string,
  days: number
) {
  const orderPage = await fetch(ORDERDATA_BASE, {
    method: 'GET',
    headers: {
      ...HEADERS,
      Referer: ORDERDATA_BASE,
      Cookie: cookieHeader,
    },
  });

  if (!orderPage.ok) {
    const snippet = (await orderPage.text().catch(() => '')).trim().slice(0, 200);
    throw new Error(`Order data page failed: ${orderPage.status} ${orderPage.statusText}. ${snippet}`);
  }

  const orderHtml = await orderPage.text();
  const inputs = extractInputs(orderHtml);
  const showOrdersSelection = extractRadioSelection(orderHtml, 'radShowOrders');
  const showStatusSelection = extractRadioSelection(orderHtml, 'radShowStatus');
  const showOrdersHidden = showOrdersSelection.hiddenValue || 'a';
  const showStatusHidden = showStatusSelection.hiddenValue || 'a';
  const showOrdersRadio = showOrdersSelection.radioValue || 'ALL';
  const showStatusRadio = showStatusSelection.radioValue || 'ALL';

  const body = new URLSearchParams({
    ...inputs,
    cbDmsLoc: dmsLoc,
    radShowOrders: showOrdersRadio,
    radShowStatus: showStatusRadio,
    txtOrderDate: startDate,
    txtNumberOfDays: String(days),
    hDmsLoc: dmsLoc,
    hShowOrders: showOrdersHidden,
    hShowStatus: showStatusHidden,
    hDeliveryDate: startDate,
    hNumberOfDays: String(days),
    hCso: '',
    htrackingNumber: '',
    hShipment: '',
    txtOrderCSO: '',
    trackingNumber: '',
    txtOrdrShipment: '',
    orderCSO: '',
    hCsvView: '',
    hExportType: '',
  }).toString();

  const response = await fetch(ORDERDATA_BASE, {
    method: 'POST',
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Referer: ORDERDATA_BASE,
      Cookie: cookieHeader,
    },
    body,
  });

  if (!response.ok) {
    const snippet = (await response.text().catch(() => '')).trim().slice(0, 200);
    throw new Error(`Order data HTML failed: ${response.status} ${response.statusText}. ${snippet}`);
  }

  return response.text();
}

type OrdersSyncOptions = {
  dmsLoc?: string;
  daysBack?: number | string;
  daysForward?: number | string;
  maxDays?: number | string;
  maxCsos?: number | string;
  batchSize?: number | string;
  useUiRange?: boolean;
  uiStartDate?: string;
  uiDays?: number | string;
};

const resolveNumber = (value: number | string | undefined, fallback: number) => {
  if (value == null) return fallback;
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export async function syncOrders(locationId: string, options?: OrdersSyncOptions): Promise<SyncResult> {
  const startTime = Date.now();
  const log: string[] = [];
  try {
    const config = await getLocationConfig(locationId);
    const cookieHeader = await getCookieHeader(locationId);
    const dmsLoc = options?.dmsLoc
      || process.env.ORDERDATA_DMS_LOC
      || process.env.INBOUND_DMS_LOC
      || '19SU';
    const daysBack = resolveNumber(options?.daysBack, Number.parseInt(process.env.ORDERDATA_DAYS_BACK || '90', 10));
    const daysForward = resolveNumber(options?.daysForward, Number.parseInt(process.env.ORDERDATA_DAYS_FORWARD || '30', 10));
    const useUiRange = typeof options?.useUiRange === 'boolean'
      ? options.useUiRange
      : process.env.ORDERDATA_USE_UI_RANGE === 'true';
    const uiStartDate = options?.uiStartDate || process.env.ORDERDATA_ORDER_DATE || formatDateForOrderData(new Date());
    const uiDays = resolveNumber(options?.uiDays, Number.parseInt(process.env.ORDERDATA_MORE_DAYS || '100', 10));
    const totalDays = Math.max(1, daysBack + daysForward);
    const maxDaysPerRequest = resolveNumber(options?.maxDays, Number.parseInt(process.env.ORDERDATA_MAX_DAYS || '100', 10));

    log.push('Starting orders sync');
    log.push(`Company ${config.companyId} • Location ${locationId}`);
    log.push(`DMS location code: ${dmsLoc}`);
    log.push(`Order window: ${daysBack} days back, ${daysForward} days forward (${totalDays} total)`);
    if (useUiRange) {
      log.push(`Order UI range: ${uiStartDate} + ${uiDays} days`);
    }
    log.push(`Order data chunk size: ${maxDaysPerRequest} days`);

    const orders: OrderDataOrder[] = [];
    const maxCsosPerChunk = resolveNumber(options?.maxCsos, Number.parseInt(process.env.ORDERDATA_MAX_CSOS || '0', 10));

    const ranges: { label: string; start: Date; days: number }[] = [];
    const today = new Date();
    if (useUiRange) {
      const parsedUiDate = parseMmDdYyyy(uiStartDate) ?? today;
      ranges.push({ label: 'ui', start: parsedUiDate, days: uiDays });
    } else {
      if (daysBack > 0) {
        ranges.push({ label: 'past', start: addDays(today, -daysBack), days: daysBack });
      }
      if (daysForward > 0) {
        ranges.push({ label: 'future', start: today, days: daysForward });
      }
      if (ranges.length === 0) {
        ranges.push({ label: 'default', start: today, days: 1 });
      }
    }

    for (const range of ranges) {
      log.push(`Order data range (${range.label}): ${formatDateForOrderData(range.start)} + ${range.days} days`);
      for (let offset = 0; offset < range.days; offset += maxDaysPerRequest) {
        const chunkDays = Math.min(maxDaysPerRequest, range.days - offset);
        const chunkStart = formatDateForOrderData(addDays(range.start, offset));
        log.push(`Order data chunk: ${chunkStart} + ${chunkDays} days`);

        const jsonResponse = await fetchOrderDataJson(cookieHeader, dmsLoc, chunkStart, chunkDays);
        const trimmed = jsonResponse.text.trim();
        if (!trimmed) {
          log.push(`Order data chunk empty (status ${jsonResponse.status}, content-type ${jsonResponse.contentType || 'unknown'})`);
          let html = await fetchOrderDataHtml(cookieHeader, dmsLoc, chunkStart, chunkDays);
          let table = parseHtmlTable(html, 'table_list');
          log.push(`Order data HTML rows: ${table.rows.length}`);
          let csos = extractOrderRows(html).map((row) => row.cso);
          if (csos.length === 0) {
            try {
              html = await fetchOrderDataHtmlViaPlaywright(locationId, dmsLoc, chunkStart, chunkDays);
              table = parseHtmlTable(html, 'table_list');
              log.push(`Order data Playwright rows: ${table.rows.length}`);
              csos = extractOrderRows(html).map((row) => row.cso);
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              log.push(`Order data Playwright failed: ${message}`);
            }
          }
          if (csos.length === 0) {
            log.push('Order data HTML returned no CSOs');
            if (chunkDays > 1) {
              log.push('Splitting HTML range into daily queries');
              const chunkStartDate = parseMmDdYyyy(chunkStart) ?? new Date();
              for (let dayOffset = 0; dayOffset < chunkDays; dayOffset += 1) {
                const dayStart = formatDateForOrderData(addDays(chunkStartDate, dayOffset));
                const dayHtml = await fetchOrderDataHtml(cookieHeader, dmsLoc, dayStart, 1);
                const dayTable = parseHtmlTable(dayHtml, 'table_list');
                if (dayTable.rows.length === 0) continue;
                const dayCsos = extractOrderRows(dayHtml).map((row) => row.cso);
                if (dayCsos.length > 0) {
                  csos.push(...dayCsos);
                }
              }
            }
          }
          if (csos.length === 0) {
            log.push('Order data HTML daily split returned no CSOs');
            continue;
          }
          const uniqueCsos = Array.from(new Set(csos));
          const limitedCsos = maxCsosPerChunk > 0 ? uniqueCsos.slice(0, maxCsosPerChunk) : uniqueCsos;
          log.push(`Order data CSOs: ${uniqueCsos.length}${maxCsosPerChunk > 0 ? ` (limited to ${limitedCsos.length})` : ''}`);
          for (const cso of limitedCsos) {
            const perCsoResponse = await fetchOrderDataJson(cookieHeader, dmsLoc, chunkStart, chunkDays, { cso });
            const perCsoTrimmed = perCsoResponse.text.trim();
            if (!perCsoTrimmed) {
              log.push(`Order data JSON empty for CSO ${cso}`);
              continue;
            }
            let parsedCso: OrderDataResponse;
            try {
              parsedCso = JSON.parse(perCsoTrimmed) as OrderDataResponse;
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              throw new Error(`Order data JSON parse failed for CSO ${cso}: ${message}`);
            }
            const csoOrders = parsedCso.order ?? [];
            if (csoOrders.length === 0) {
              log.push(`Order data JSON empty for CSO ${cso}`);
              continue;
            }
            orders.push(...csoOrders);
          }
          continue;
        }
        if (trimmed.startsWith('<')) {
          const snippet = trimmed.slice(0, 200).replace(/\s+/g, ' ');
          throw new Error(`Order data JSON returned HTML: ${snippet}`);
        }
        let parsed: OrderDataResponse;
        try {
          parsed = JSON.parse(trimmed) as OrderDataResponse;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const snippet = trimmed.slice(0, 200).replace(/\s+/g, ' ');
          throw new Error(`Order data JSON parse failed: ${message}. Snippet: ${snippet}`);
        }

        const chunkOrders = parsed.order ?? [];
        log.push(`Order data chunk records: ${chunkOrders.length}`);
        orders.push(...chunkOrders);
      }
    }

    const uniqueOrders = new Map<string, OrderDataOrder>();
    for (const order of orders) {
      const cso = toText(order.cso);
      if (!cso) continue;
      uniqueOrders.set(cso, order);
    }
    const dedupedOrders = Array.from(uniqueOrders.values());
    log.push(`Order data records: ${dedupedOrders.length}`);

    const now = new Date().toISOString();
    const orderRows = [] as Record<string, unknown>[];
    const deliveryRows = [] as Record<string, unknown>[];
    const lineRows = [] as Record<string, unknown>[];

    for (const order of dedupedOrders) {
      const cso = toText(order.cso);
      if (!cso) continue;
      orderRows.push({
        cso,
        company_id: config.companyId,
        location_id: locationId,
        order_type: toText(order.order_type),
        order_date: parseDate(order.order_date),
        customer_name: toText(order.customer_name),
        customer_account: toText(order.customer_account),
        customer_phone: toText(order.customer_phone),
        freight_terms: toText(order.freight_terms),
        shipping_instructions: toText(order.shipping_instructions),
        shipping_method: toText(order.shipping_method),
        additional_service: toText(order.additional_service),
        points: toNumber(order.points),
        last_seen_at: now,
        updated_at: now,
      });

      for (const delivery of order.delivery ?? []) {
        const deliveryId = toText(delivery.delivery_id);
        if (!deliveryId) continue;
        deliveryRows.push({
          delivery_id: deliveryId,
          cso,
          company_id: config.companyId,
          location_id: locationId,
          delivery_status: toText(delivery.delivery_status),
          cso_type: toText(delivery.cso_type),
          customer_po_number: toText(delivery.customer_po_number),
          rap: toText(delivery.rap),
          zip_group: toText(delivery.zip_group),
          delivery_date: parseDate(delivery.delivery_date),
          delivery_name: toText(delivery.delivery_name),
          delivery_address_1: toText(delivery.delivery_address_1),
          delivery_address_2: toText(delivery.delivery_address_2),
          delivery_city: toText(delivery.delivery_city),
          delivery_state: toText(delivery.delivery_state),
          delivery_zip: toText(delivery.delivery_zip),
          delivery_phone: delivery.delivery_phone ?? [],
          last_updated_date: parseTimestamp(delivery.last_updated_date),
          last_seen_at: now,
          updated_at: now,
        });

        for (const product of delivery.product ?? []) {
          const shipmentNumber = toText(product.shipment_number);
          const trackingNumber = toText(product.customer_tracking_number);
          for (const line of product.line ?? []) {
            const lineNumber = toText(line.line_number);
            if (!lineNumber) continue;
            const accessory = line.model_accessory ?? {};
            lineRows.push({
              cso,
              delivery_id: deliveryId,
              line_number: lineNumber,
              company_id: config.companyId,
              location_id: locationId,
              line_status: toText(line.line_status),
              line_type: 'product',
              item_type: toText(accessory.item_type),
              item: toText(accessory.item),
              product_type: toText(accessory.product_type),
              crated_indicator: toText(accessory.crated_indicator),
              anti_tip_indicator: toText(accessory.anti_tip_indicator),
              product_weight: toInteger(accessory.product_weight),
              nmfc: toText(accessory.nmfc),
              carton_code: toText(accessory.carton_code),
              quantity: toInteger(accessory.quantity),
              points: toNumber(accessory.points),
              shipment_number: shipmentNumber,
              customer_tracking_number: trackingNumber,
              serials: accessory.assigned_serials ?? [],
              last_seen_at: now,
              updated_at: now,
            });
          }
        }

        for (const service of delivery.service ?? []) {
          const trackingNumber = toText(service.customer_tracking_number);
          for (const line of service.line ?? []) {
            const lineNumber = toText(line.line_number);
            if (!lineNumber) continue;
            lineRows.push({
              cso,
              delivery_id: deliveryId,
              line_number: lineNumber,
              company_id: config.companyId,
              location_id: locationId,
              line_status: toText(line.line_status),
              line_type: 'service',
              item_type: null,
              item: toText(line.item),
              product_type: null,
              crated_indicator: null,
              anti_tip_indicator: null,
              product_weight: null,
              nmfc: null,
              carton_code: null,
              quantity: toInteger(line.quantity),
              points: null,
              shipment_number: null,
              customer_tracking_number: trackingNumber,
              serials: [],
              last_seen_at: now,
              updated_at: now,
            });
          }
        }
      }
    }

    const db = getSupabase();
    const batchSize = resolveNumber(options?.batchSize, Number.parseInt(process.env.ORDERDATA_BATCH_SIZE || '500', 10));

    if (orderRows.length > 0) {
      for (const chunk of chunkArray(orderRows, batchSize)) {
        const { error } = await db
          .from('orders')
          .upsert(chunk, { onConflict: 'cso,location_id' });
        if (error) throw new Error(`Orders upsert failed: ${error.message}`);
      }
    }

    if (deliveryRows.length > 0) {
      for (const chunk of chunkArray(deliveryRows, batchSize)) {
        const { error } = await db
          .from('order_deliveries')
          .upsert(chunk, { onConflict: 'delivery_id,cso,location_id' });
        if (error) throw new Error(`Order deliveries upsert failed: ${error.message}`);
      }
    }

    if (lineRows.length > 0) {
      for (const chunk of chunkArray(lineRows, batchSize)) {
        const { error } = await db
          .from('order_lines')
          .upsert(chunk, { onConflict: 'cso,delivery_id,line_number,location_id' });
        if (error) throw new Error(`Order lines upsert failed: ${error.message}`);
      }
    }

    await updateSyncTimestamp(locationId, 'orders');

    log.push(`Orders upserted: ${orderRows.length}`);
    log.push(`Deliveries upserted: ${deliveryRows.length}`);
    log.push(`Lines upserted: ${lineRows.length}`);

    return {
      success: true,
      stats: {
        totalGEItems: lineRows.length,
        itemsInLoads: 0,
        unassignedItems: 0,
        newItems: lineRows.length,
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
