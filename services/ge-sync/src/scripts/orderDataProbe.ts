import 'dotenv/config';
import { getCookieHeader } from '../auth/playwright.js';
import { getLocationConfig } from '../db/supabase.js';
import { GE_DMS_BASE } from '../sync/endpoints.js';
import * as fs from 'fs/promises';

type OrderRow = {
  index: number;
  cso: string;
  trackingNumber?: string;
  deliveryNumber?: string;
  deliveryDate?: string;
};

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const ORDERDATA_BASE = `${GE_DMS_BASE}/dms/orderdata`;
const ORDERDATA_JSON = `${GE_DMS_BASE}/dms/orderdata/downloadjson`;
const TRACKTRACE_DETAIL = `${GE_DMS_BASE}/dms/tracktrace/trackDetailMain`;

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
  const selectRegex = new RegExp(`<select[^>]*name=["']${selectName}["'][^>]*>([\\s\\S]*?)<\\/select>`, 'i');
  const match = html.match(selectRegex);
  if (!match) return null;
  const selectBody = match[1];
  const selected = selectBody.match(/<option[^>]*selected[^>]*value=["']([^"']*)["'][^>]*>/i)
    || selectBody.match(/<option[^>]*selected[^>]*>([\s\S]*?)<\/option>/i);
  if (selected) {
    const value = selected[1] ? selected[1] : stripHtml(selected[0]);
    return value;
  }
  const first = selectBody.match(/<option[^>]*value=["']([^"']*)["'][^>]*>/i)
    || selectBody.match(/<option[^>]*>([\s\S]*?)<\/option>/i);
  return first ? (first[1] ? first[1] : stripHtml(first[0])) : null;
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

function parseHtmlTable(html: string, tableId: string): { headers: string[]; rows: string[][] } {
  const tableRegex = new RegExp(`<table[^>]*id=["']${tableId}["'][\\s\\S]*?<\\/table>`, 'i');
  const tableMatch = html.match(tableRegex);
  if (!tableMatch) return { headers: [], rows: [] };

  const tableHtml = tableMatch[0];
  const rowMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  const rows: string[][] = [];
  let headers: string[] = [];

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
    rows.push(cells);
  }

  return { headers, rows };
}

function extractOrderRows(html: string): OrderRow[] {
  const orderRows: OrderRow[] = [];
  const orderNumberRegex = /id=["']orderNumber(\d+)["'][^>]*value=["']([^"']+)["']/gi;
  const trackingRegex = /id=["']trackingNumber(\d+)["'][^>]*value=["']([^"']*)["']/gi;
  const deliveryNumberRegex = /id=["']deliveryNumber(\d+)["'][^>]*value=["']([^"']*)["']/gi;
  const deliveryDateRegex = /id=["']deliveryDate(\d+)["'][^>]*value=["']([^"']*)["']/gi;

  const trackingMap = new Map<string, string>();
  const deliveryNumberMap = new Map<string, string>();
  const deliveryDateMap = new Map<string, string>();

  for (const match of html.matchAll(trackingRegex)) {
    trackingMap.set(match[1], match[2]);
  }
  for (const match of html.matchAll(deliveryNumberRegex)) {
    deliveryNumberMap.set(match[1], match[2]);
  }
  for (const match of html.matchAll(deliveryDateRegex)) {
    deliveryDateMap.set(match[1], match[2]);
  }

  for (const match of html.matchAll(orderNumberRegex)) {
    const index = Number.parseInt(match[1], 10);
    if (!Number.isFinite(index)) continue;
    const cso = match[2];
    orderRows.push({
      index,
      cso,
      trackingNumber: trackingMap.get(match[1]) || undefined,
      deliveryNumber: deliveryNumberMap.get(match[1]) || undefined,
      deliveryDate: deliveryDateMap.get(match[1]) || undefined,
    });
  }

  return orderRows;
}

async function fetchOrderDataHtml(cookieHeader: string, shipmentNumber: string) {
  const orderPage = await fetch(ORDERDATA_BASE, {
    method: 'GET',
    headers: {
      ...HEADERS,
      Referer: ORDERDATA_BASE,
      Cookie: cookieHeader,
    },
  });

  const orderHtml = await orderPage.text();
  const inputs = extractInputs(orderHtml);
  const dmsLoc = process.env.ORDERDATA_DMS_LOC
    || process.env.INBOUND_DMS_LOC
    || extractSelectedOption(orderHtml, 'cbDmsLoc')
    || inputs.hDmsLoc
    || '';
  const showOrdersSelection = extractRadioSelection(orderHtml, 'radShowOrders');
  const showStatusSelection = extractRadioSelection(orderHtml, 'radShowStatus');
  const showOrdersHidden = showOrdersSelection.hiddenValue || 'a';
  const showStatusHidden = showStatusSelection.hiddenValue || 'a';
  const showOrdersRadio = showOrdersSelection.radioValue || 'ALL';
  const showStatusRadio = showStatusSelection.radioValue || 'ALL';
  const orderDate = process.env.ORDERDATA_ORDER_DATE || inputs.txtOrderDate || inputs.orderDate || '';
  const numberOfDays = process.env.ORDERDATA_MORE_DAYS || inputs.txtNumberOfDays || inputs.numberOfDays || '1';
  const showOrdersOverride = process.env.ORDERDATA_SHOW_ORDERS || showOrdersHidden;
  const showStatusOverride = process.env.ORDERDATA_SHOW_STATUS || showStatusHidden;
  const jsonVersion = extractSelectedOption(orderHtml, 'jsonDataVersion') || 'V2';

  const body = new URLSearchParams({
    ...inputs,
    cbDmsLoc: dmsLoc,
    radShowOrders: showOrdersRadio,
    radShowStatus: showStatusRadio,
    txtOrderDate: orderDate,
    txtNumberOfDays: numberOfDays,
    hDmsLoc: dmsLoc,
    hShowOrders: showOrdersOverride,
    hShowStatus: showStatusOverride,
    hDeliveryDate: orderDate,
    hNumberOfDays: numberOfDays,
    hCso: '',
    htrackingNumber: '',
    hShipment: shipmentNumber,
    txtOrdrShipment: shipmentNumber,
    txtOrderCSO: '',
    trackingNumber: '',
    orderCSO: '',
    hCsvView: '',
    hExportType: '',
    jsonDataVersion: jsonVersion,
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
    throw new Error(`Order data request failed: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return { html, body, dmsLoc };
}

async function fetchOrderDataJson(cookieHeader: string, body: string) {
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
    throw new Error(`Order data JSON failed: ${response.status} ${response.statusText}`);
  }

  const jsonText = await response.text();
  return jsonText;
}

function extractMessageDisplay(html: string): string | null {
  const match = html.match(/<div class="messageDisplay">([\s\S]*?)<\/div>/i);
  if (!match) return null;
  const message = stripHtml(match[1]);
  return message || null;
}

async function fetchTrackTrace(cookieHeader: string, dmsLoc: string, order: OrderRow) {
  const body = new URLSearchParams({
    hDmsLoc: dmsLoc,
    hCso: order.cso,
    orderNumber: order.cso,
    htrackingNumber: order.trackingNumber ?? '',
    deliveryNumber: order.deliveryNumber ?? '',
    deliveryDate: order.deliveryDate ?? '',
  }).toString();

  const response = await fetch(TRACKTRACE_DETAIL, {
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
    throw new Error(`Track & Trace failed for ${order.cso}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function main() {
  const locationId = process.env.LOCATION_ID || '00000000-0000-0000-0000-000000000001';
  const shipmentNumber = process.env.ORDERDATA_SHIPMENT || process.argv[2] || '';
  const maxOrders = Number.parseInt(process.env.ORDERDATA_MAX_CSOS || '5', 10);

  if (!shipmentNumber) {
    console.log('No inbound shipment provided. Running without shipment filter.');
  }

  await getLocationConfig(locationId);
  const cookieHeader = await getCookieHeader(locationId);

  const { html, body, dmsLoc } = await fetchOrderDataHtml(cookieHeader, shipmentNumber);
  const timestamp = Date.now();
  await fs.writeFile(`/tmp/orderdata-${timestamp}.html`, html);
  await fs.writeFile(`/tmp/orderdata-${timestamp}.body.txt`, body);
  console.log(`Order data HTML saved: /tmp/orderdata-${timestamp}.html`);
  console.log(`Order data POST body saved: /tmp/orderdata-${timestamp}.body.txt`);

  const message = extractMessageDisplay(html);
  if (message) {
    console.log(`Order data message: ${message}`);
  }

  const table = parseHtmlTable(html, 'table_list');
  console.log(`Order data table headers: ${table.headers.join(' | ')}`);
  console.log(`Order data rows: ${table.rows.length}`);

  const orderRows = extractOrderRows(html);
  console.log(`Order data CSOs (from hidden inputs): ${orderRows.length}`);

  const limitedOrders = orderRows.slice(0, Math.max(1, maxOrders));
  for (const order of limitedOrders) {
    console.log(`Track & Trace for CSO ${order.cso}`);
    const detailHtml = await fetchTrackTrace(cookieHeader, dmsLoc, order);
    const detailPath = `/tmp/tracktrace-${order.cso}-${timestamp}.html`;
    await fs.writeFile(detailPath, detailHtml);
    console.log(`Track & Trace HTML saved: ${detailPath}`);
  }

  const jsonText = await fetchOrderDataJson(cookieHeader, body);
  const jsonPath = `/tmp/orderdata-${shipmentNumber}-${timestamp}.json`;
  await fs.writeFile(jsonPath, jsonText);
  console.log(`Order data JSON saved: ${jsonPath}`);
}

main().catch((error) => {
  console.error('Order data probe failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
