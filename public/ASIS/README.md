# ASIS Data Export – End-to-End CSV / JSON Snapshot Pipeline

This document describes how to fetch **all ASIS-related spreadsheets from GE DMS**, convert them to CSV, expand them into **per-load CSV files**, and optionally generate **JSON mirrors** for simplified consumption.

No UI scraping. No deduping. No interpretation.
This is a **pure “mirror GE outputs” snapshot pipeline**.

---

## Prerequisites

### 1. Tools

* macOS (or Linux)
* `curl`
* `brew`
* `gnumeric` (for `ssconvert`)
* Node.js (for CSV → JSON conversion)

Install gnumeric:

```bash
brew install gnumeric
```

---

### 2. Auth

* You must be logged into GE DMS in a browser
* Export or manually maintain a valid `cookies.txt` **in the project root**
* Required cookies include:

  * `mod_auth_openidc_session`
  * `JSESSIONID`
  * `AWSALB` / `AWSALBCORS`
  * `__cf_bm`

> ⚠️ Do **not** let curl overwrite your cookies unless you intend to.
> All commands below assume `cookies.txt` already exists and is valid.

---

## Project Layout

Scripts and auth live in the **project root**:

```text
cookies.txt
fetch_all_asis_load_data.sh
fetch_all_asis_load_report_history_data.sh
csv-to-json.sh
```

Snapshot outputs live under `public/ASIS`:

```text
public/
  ASIS/
    ASISLoadData.xls
    ASISLoadData.csv
    ASISLoadData/
      <LOADID>.csv
      <LOADID>.json

    ASISReportHistoryData.xls
    ASISReportHistoryData.csv
    ASISReportHistoryData/
      <LOADID>.csv
      <LOADID>.json

    ASIS.xls
    ASIS.csv
    ASIS.json
```

CSV files are the **authoritative snapshot**.
JSON files are **derived views** and can be regenerated at any time.

---

## Step 1: Download the master XLS files

Run all commands **from the project root**.

### ASIS Load List

```bash
curl -sSL \
  -b cookies.txt \
  -H 'Referer: https://dms-erp-aws-prd.geappliances.com/dms/newasis' \
  -H 'User-Agent: Mozilla/5.0' \
  --data 'request=ASIS&dmsLoc=9SU' \
  'https://dms-erp-aws-prd.geappliances.com/dms/newasis/downloadExcelSpreadsheet' \
  -o public/ASIS/ASISLoadData.xls
```

---

### ASIS Report History

```bash
curl -sSL \
  -b cookies.txt \
  -H 'Referer: https://dms-erp-aws-prd.geappliances.com/dms/newasis' \
  -H 'User-Agent: Mozilla/5.0' \
  --data 'dmsLoc=9SU' \
  'https://dms-erp-aws-prd.geappliances.com/dms/newasis/downloadReportHistoryExcelSpreadsheet' \
  -o public/ASIS/ASISReportHistoryData.xls
```

---

### ASIS Inventory (Products)

```bash
curl -sSL \
  -b cookies.txt \
  -H 'Referer: https://dms-erp-aws-prd.geappliances.com/dms' \
  -H 'User-Agent: Mozilla/5.0' \
  'https://dms-erp-aws-prd.geappliances.com/dms/asis/downloadExcelSpreadsheet' \
  -o public/ASIS/ASIS.xls
```

---

## Step 2: Convert all XLS files to CSV

```bash
ssconvert public/ASIS/ASISLoadData.xls public/ASIS/ASISLoadData.csv
ssconvert public/ASIS/ASISReportHistoryData.xls public/ASIS/ASISReportHistoryData.csv
ssconvert public/ASIS/ASIS.xls public/ASIS/ASIS.csv
```

At this point you have **all GE-provided top-level datasets as CSV**.

---

## Step 3: Expand per-load CSVs (NO DEDUPE)

Each load number corresponds to exactly one per-load CSV, fetched via:

```
POST /dms/newasis/downloadCsvSpreadsheet
  ?invOrg=<INVORG>
  &createDate=<TIMESTAMP>
Body: hCsvView=CSV
```

The **load number encodes both values**:

```
9SU20260114134738
^^^└────────────── createDate
│
└─ invOrg
```

These expansions are implemented as **standalone scripts**.

---

### A. Expand loads from `ASISLoadData.csv`

```bash
./fetch_all_asis_load_data.sh
```

This script:

* Reads `public/ASIS/ASISLoadData.csv`
* Extracts load numbers (column 1)
* Downloads one CSV per load into:

  ```
  public/ASIS/ASISLoadData/
  ```

---

### B. Expand loads from `ASISReportHistoryData.csv`

```bash
./fetch_all_asis_load_report_history_data.sh
```

This script:

* Reads `public/ASIS/ASISReportHistoryData.csv`
* Extracts load numbers (column 2)
* Downloads one CSV per load into:

  ```
  public/ASIS/ASISReportHistoryData/
  ```

> No deduplication is performed.
> Loads may exist in more than one dataset intentionally.

---

## Step 4 (Optional): Convert CSV snapshots to JSON

This step generates **JSON mirrors** of all CSV files for easier consumption by the Warehouse app or other tooling.

Install the converter once:

```bash
npm install --save-dev csvtojson
```

Run the conversion script (from project root):

```bash
./csv-to-json.sh
```

This script:

* Converts all top-level CSVs to JSON
* Converts all per-load CSVs to JSON
* Does **not** modify or delete CSVs
* Is safe to run repeatedly
* Requires no network access

CSV remains the source of truth; JSON is always regenerable.

---

## Final Result

You now have:

* ✅ All **GE-provided XLS exports converted to CSV**
* ✅ All **per-load CSVs** from:

  * current loads
  * historical loads
* ✅ Optional **JSON mirrors** for all datasets
* ✅ No deduplication or mutation
* ✅ Clear provenance via directory structure

This dataset is suitable for:

* snapshot-based testing
* serial overlap analysis
* load comparison
* Supabase ingestion
* reconciliation with ASIS inventory data

---

## Sane Progression (Intentional, Not Required)

This pipeline is designed to evolve gradually:

1. **Mirror GE outputs** (CSV) ✅
2. **Generate JSON views** (optional) ✅
3. Observe real data patterns
4. Add a small `manifest.json` (index + metadata)
5. Normalize schemas selectively (types, dates, naming)
6. Automate sync / ingestion when needed

Nothing beyond step 2 is required to build and test Warehouse today.

---

## Notes / Guardrails

* If any output file contains HTML instead of CSV, auth expired → refresh cookies.
* Always run commands from the project root so `cookies.txt` resolves correctly.
* Fetch scripts are networked and auth-dependent.
* `csv-to-json.sh` is purely local and deterministic.
* This pipeline intentionally preserves duplicates and historical overlap.
* CSV is the authoritative snapshot; JSON is a derived artifact.

