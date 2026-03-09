

# Enhancements: Templates, Status Save, Product Bulk Delete

## 1. Download Template Buttons (Both Import Dialogs)

### AdminUsers.tsx
- Add a "Download Template" button in the import dialog (before file upload)
- Generates an `.xlsx` file with headers: `full_name, email, phone, password, role`
- Uses the existing `xlsx` library: create a workbook with one empty row of headers, trigger download

### AdminProducts.tsx
- Same pattern: "Download Template" button with headers: `sku, name, brand, category, description, estimated_price`

## 2. User Status: Change to Save-to-Apply Pattern (AdminUsers.tsx)

Currently the dropdown immediately calls the edge function on click. Change to:
- Replace the dropdown with an inline `Select` component in the Status column showing current status (active/inactive)
- Track pending status changes in local state: `Map<userId, newStatus>`
- Show a "Save Changes" button (floating bar or top bar) when there are pending changes
- On "Save", iterate pending changes and call `manage-user` edge function for each
- Clear pending state on success

## 3. Product Bulk Delete with Checkboxes (AdminProducts.tsx)

Mirror the pattern from AdminUsers:
- Add `selectedProductIds` state
- Add checkbox column (header = select all, rows = individual)
- Show floating action bar when products selected with "Delete Selected" button
- Add `AlertDialog` confirmation
- Delete via `supabase.from('products').delete().in('id', selectedProductIds)`
- Refetch on success

## Files to Modify
- `src/pages/admin/AdminUsers.tsx` — download template, save-to-apply status
- `src/pages/admin/AdminProducts.tsx` — download template, checkbox bulk delete

