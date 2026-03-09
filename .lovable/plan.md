# User Management & Import Features

## 1. Admin Users Page - Manage Users

### User Actions Dropdown (per row)

- Add a dropdown menu (DropdownMenu) on each user row with actions:
  - **Set Active** - updates `profiles.status` to `'active'`
  - **Set Inactive** - updates `profiles.status` to `'inactive'`

### Bulk Selection & Delete

- Add a checkbox column (header = select all, rows = individual select)
- Track selected user IDs in state
- Show a floating action bar when users are selected with:
  - **Delete Selected** button (with confirmation AlertDialog)
  - Count of selected users
- Delete flow: call the `create-user` edge function (extended) or a new edge function to delete users via `auth.admin.deleteUser` (since deleting auth users requires service role key)

### Edge Function: `manage-user`

- New edge function to handle:
  - `action: 'update_status'` - updates `profiles.status`
  - `action: 'delete'` - deletes user via `auth.admin.deleteUser` (cascades to profiles/roles via FK)
- Protected: caller must be `super_admin`

### User Import Button

- "Import Users" button next to "Add User"
- Opens a dialog to upload a Excel file (columns: full_name, email, phone, password, role)
- Parses Excel client-side, shows preview table
- On confirm, calls `create-user` edge function for each row sequentially
- Shows progress and results (success/error count)

## 2. Admin Products Page - Import Button

### Product Import Button

- "Import Products" button next to "Add Product"
- Opens a dialog to upload a Excel file (columns: sku, name, brand, category, description, estimated_price)
- Parses Excel client-side, shows preview table with validation
- On confirm, batch inserts into `products` table via Supabase client
- Category matching: match category name to existing categories
- Shows results summary

## 3. Database Migration

- No schema changes needed. `profiles.status` column already exists with default `'active'`.

## Files to Create/Modify

- **Create** `supabase/functions/manage-user/index.ts` - edge function for status update and user deletion
- **Modify** `src/pages/admin/AdminUsers.tsx` - add dropdown, checkboxes, bulk delete bar, import dialog
- **Modify** `src/pages/admin/AdminProducts.tsx` - add import dialog
- **Modify** `supabase/config.toml` - register new edge function