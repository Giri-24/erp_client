# Academic Year Backend Contract

This module already has an academic-year creation page, but there is no academic-year edit page or update API in the current frontend.

## Current Gap

- Fees pages such as collection, reports, dashboard, and fee views load academic years through `GET /fees/academic-years`.
- The backend controller note currently guards that endpoint with `fees:structure:read`.
- Many fees pages are used by roles that only have `fees:read`, `fees:collect`, `fees:assign`, or `fees:dashboard`, so the academic-year dropdown can come back empty even when fee data exists.

## Required Permission Fix

`GET /fees/academic-years` should be readable by all fees pages that need year selection.

Recommended backend guard:

- allow `fees:read`
- allow `fees:collect`
- allow `fees:assign`
- allow `fees:dashboard`
- allow `fees:structure:read`

If the backend supports only one permission per route today, the safest short-term option is to move this endpoint to the broader fees read permission.

## Expected List API

### GET `/fees/academic-years`

Response:

```json
[
  "2026-2027",
  "2025-2026",
  "2024-2025"
]
```

Notes:

- Return distinct academic years from both fee structures and assigned student fees.
- Sort descending.
- This endpoint should not require structure-management access.

## Needed Update API For Edit Page

There is no update endpoint for academic years right now. To support an edit page, add this API.

### PUT `/fees/academic-years/:academicYearId`

Request body:

```json
{
  "academicYear": "2026-2027"
}
```

Response:

```json
{
  "id": "ay_01",
  "academicYear": "2026-2027"
}
```

Expected logic:

1. Validate format such as `2026-2027`.
2. Ensure the target academic year exists.
3. Prevent duplicates.
4. Update the academic year wherever the backend stores the canonical record.
5. If the year is denormalized into fee structures or student-fee rows, either:
   - cascade the update transactionally, or
   - reject the update with a clear message explaining why rename is blocked.

Suggested validation errors:

- `Academic year already exists`
- `Invalid academic year format`
- `Academic year not found`
- `Academic year cannot be renamed because linked fee records already exist`

## Optional Delete API

Only add delete if the product actually needs it.

### DELETE `/fees/academic-years/:academicYearId`

Suggested behavior:

- allow delete only when no fee structure and no student fee is linked to that year
- otherwise return `400 Academic year is in use`

## Frontend Status

- Management page exists: `src/modules/fees/pages/AcademicYearCreationPage.jsx`
- Frontend now supports create, list, and edit initiation for academic years
- Rename will work once `PUT /fees/academic-years/:academicYearId` is implemented in backend
- Frontend now includes a fallback so academic years can still be derived from fee records when the list endpoint is blocked or empty