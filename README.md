# Quotation Manager

A modern, SaaS-style quotation management application. This is the foundation
build: the Quotation creation workflow, a scalable Next.js structure, and a
Google Sheets-backed API layer that later modules (Customers, Reports,
Approvals, etc.) can plug into.

## Stack

- Next.js 14 (App Router) + React 18
- JavaScript only (no TypeScript)
- Tailwind CSS
- Zod for validation (shared between client and API route)
- `googleapis` for the Google Sheets integration (server-side only)

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your Google service account details
npm run dev
```

Visit `http://localhost:3000` — it redirects to `/quotations`, with
`/quotations/new` as the quotation creation workflow.

## Connecting Google Sheets

1. In Google Cloud Console, create a **service account** and enable the
   Google Sheets API for the project.
2. Generate a JSON key for the service account.
3. Share your target Google Sheet with the service account's email address
   (Editor access).
4. In the sheet, create a tab (default name `Quotations`) with a header row
   matching the column order in
   `src/lib/services/googleSheetsService.js` → `buildQuotationRows`.
5. Fill in `.env.local`:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (keep the `\n` escape sequences as-is)
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SHEET_TAB` (optional, defaults to `Quotations`)

The frontend never talks to Google Sheets directly. It POSTs to
`/api/quotations`, which validates the payload with Zod and — only if valid —
writes rows to the sheet via `googleSheetsService.js`.

## Folder structure

```
src/
  app/
    layout.js                 Root layout, fonts, ToastProvider
    page.js                   Redirects "/" to "/quotations"
    globals.css
    quotations/
      page.js                 Quotations list (stub, ready for a future GET-backed table)
      new/page.js             Quotation creation workflow
    api/
      quotations/route.js     POST (create) + GET (stub) endpoints

  components/
    ui/                       Generic, reusable primitives (Button, Input, Select,
                               Textarea, Card, Badge, Toaster, FieldShell)
    layout/                   AppShell, Sidebar, Topbar — shared app chrome
    quotations/                Quotation-module-specific components
      CustomerInfoSection.js
      QuotationInfoSection.js
      ItemListSection.js / ItemRow.js
      SummaryRail.js           The "ledger" running-total panel
      QuotationForm.js          Composes the three sections + summary rail

  hooks/
    useQuotationForm.js        Form state, validation wiring, submit logic
    useToast.js                 Toast context/provider (no external dep)

  lib/
    validation/quotationSchema.js   Zod schemas, shared client + server
    services/googleSheetsService.js  Server-only Sheets client
    constants/quotationOptions.js    Dropdown option lists, empty-row factory
    utils/formatters.js              Currency + totals math
    utils/cn.js                      className helper
```

## Adding a new module later

The structure is intentionally modular so growth doesn't require refactors:

- **New page/route**: add a folder under `src/app/<module>` and reuse
  `AppShell` for consistent chrome.
- **New nav item**: add an entry to `NAV_ITEMS` in
  `src/components/layout/Sidebar.js` (flip `available: true` once the route
  exists).
- **New backend logic**: add a route under `src/app/api/<module>/route.js`
  and a matching service in `src/lib/services/`. Keep Google Sheets (or any
  other data store) access inside `lib/services` — never called from
  components directly.
- **New form fields**: extend the relevant Zod schema in
  `lib/validation/quotationSchema.js`, then add the field to the matching
  section component and the initial state in `useQuotationForm.js`.
- **Shared UI**: new form controls belong in `components/ui/` so every
  future module gets the same look for free.

## Design notes

The visual direction is a "ledger" theme: a dark, structured sidebar/summary
panel next to light, spacious form cards — reflecting that a quotation is,
at its core, a running total that always needs to be visible while you
build it. Item rows are numbered because they are a genuine ordered list
(the line items on the eventual PDF quotation), not decoration.
