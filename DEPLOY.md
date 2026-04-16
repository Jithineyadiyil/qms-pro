# Attachment Complete Fix — 2 files

## Copy to qms-frontend\src\

```
app/core/services/requests.service.ts
app/features/requests/request-list/requests-list.component.ts
```

## What was fixed

### 1. requests.service.ts — Wrong API paths
  Before: GET /requests/users    → 404
  After:  GET /users             ✓

  Before: GET /requests/departments → 404
  After:  GET /departments          ✓

### 2. requests-list.component.ts — Two fixes:

  a) Attachments now display in the detail modal "Details" tab
     After the Resolution section, saved attachments appear as
     a list with file icon, filename, and an Open/download link.

  b) attachUrl() and attachIcon() helper methods added so the
     template can build the public storage URL from the stored path.

## After copying
No artisan commands needed — Angular dev server hot-reloads both files.
