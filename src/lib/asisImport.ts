import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const ASIS_BASE_URL = (import.meta.env.VITE_ASIS_BASE_URL as string | undefined) ?? '/ASIS';

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/$/, '');

export const getAsisFileUrl = (fileName: string) => `${normalizeBaseUrl(ASIS_BASE_URL)}/${fileName}`;

export async function fetchAsisXlsRows<T>(fileName: string): Promise<T[]> {
  const response = await fetch(getAsisFileUrl(fileName));
  if (!response.ok) {
    throw new Error(`Failed to load ${fileName} (${response.status})`);
  }
  const data = await response.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<T>(sheet, { defval: '' });
}

export async function fetchAsisCsvRows<T>(fileName: string): Promise<T[]> {
  const response = await fetch(getAsisFileUrl(fileName));
  if (!response.ok) {
    throw new Error(`Failed to load ${fileName} (${response.status})`);
  }
  const text = await response.text();
  const result = Papa.parse<T>(text, { header: true, skipEmptyLines: true });
  if (result.errors.length) {
    const message = result.errors.map(error => error.message).join('; ');
    throw new Error(`Failed to parse ${fileName}: ${message}`);
  }
  return result.data ?? [];
}
