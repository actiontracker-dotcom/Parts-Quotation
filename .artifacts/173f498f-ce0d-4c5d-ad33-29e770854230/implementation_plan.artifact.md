# Implementation Plan - Fix Quotation Edit Freshness

Fix the stale data issue when editing existing quotations by disabling Next.js fetch caching for Google Sheets reads and correcting the post-update verification logic.

## User Review Required

> [!IMPORTANT]
> The fix involves disabling Next.js Data Cache for Google Sheets API calls in the quotation CRUD path. This ensures that any read following a write returns the most up-to-date data, solving the consistency issue.

## Proposed Changes

### [Core Services]

#### [MODIFY] [googleSheetsClient.js](file:///C:/Users/alokp/OneDrive/Desktop/O2D/src/lib/services/googleSheetsClient.js)
- Update `sheetsFetch` to accept a `cache` option.
- Default to `no-store` for quotation-related operations while allowing master data to remain cacheable if desired (though for now, I will prioritize correctness and use `no-store` for the primary `readSheetRange` calls used in quotations).

#### [MODIFY] [googleSheetsService.js](file:///C:/Users/alokp/OneDrive/Desktop/O2D/src/lib/services/googleSheetsService.js)
- Fix `updateQuotationByNo` to allow clearing fields (overwriting with empty strings).
- Ensure `buildQuotationRows` correctly maps all fields.

### [API Routes]

#### [MODIFY] [route.js](file:///C:/Users/alokp/OneDrive/Desktop/O2D/src/app/api/quotations/%5BquotationNo%5D/route.js)
- Correct the `expectedTotal` calculation in the `PUT` handler to match `computeQuotationTotals`.
- Enhance the verification loop to compare item counts and totals more accurately.
- Return a failure response if verification fails after all attempts, instead of a "fake success".

## Verification Plan

### Automated Tests
- Run `npm run build` to ensure no regressions in build logic.

### Manual Verification
1. **Edit Item**: Change quantity of an existing item, save, and immediately click the quotation number. Verify Detail and PDF show the new quantity.
2. **Add/Delete Item**: Add a new item and delete an existing one. Save and verify Detail shows the correct item count and list.
3. **Clear Field**: Clear an editable field (e.g., Engineer Remark). Save and verify it is blank in Detail.
4. **Follow-up Check**: Verify that editing a quotation does not wipe out its follow-up history.
5. **Total Verification**: Ensure grand totals in Detail and PDF match the edited values.
