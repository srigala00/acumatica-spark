

## Plan: User Unit Field + Admin Order Management Enhancements

### 1. Add "Unit" field to User Profiles

**Database migration:**
- Add `unit` column (text, nullable) to `profiles` table

**Code changes:**
- `AdminUsers.tsx`: Add "Unit" column to the user table, add "Unit" input to create & edit user forms, include in API calls
- `create-user/index.ts` and `manage-user/index.ts`: Handle `unit` field
- `Cart.tsx`: Optionally pre-fill unit from profile

### 2. Admin Order Detail Enhancements

**Show additional fields in order detail dialog (`AdminOrders.tsx`):**
- Display **Inventory ID** for each item (requires joining `request_items` with `products` table via `product_id` to get `inventory_id`)
- Display **Business Account** (already stored on `requests` table, already shown conditionally -- make it always visible)

### 3. Admin/Sales Can Edit Orders

**Add editable mode to the order detail dialog (`AdminOrders.tsx`):**
- Make order fields editable: company name, contact person, email, phone, shipping address, business account, description
- Allow admin/sales to **add new items** to an existing order (select from products list, set qty/spec)
- Allow admin/sales to **edit existing items** (change quantity, specification)
- Allow admin/sales to **remove items** from an order

**Database changes needed:**
- Add RLS policies for `request_items` UPDATE and DELETE for sales/super_admin roles
- Add `inventory_id` column to `request_items` table so admin can store/override it per item

**Migration SQL:**
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unit text;

ALTER TABLE public.request_items ADD COLUMN IF NOT EXISTS inventory_id text;

-- Allow admin/sales to update request items
CREATE POLICY "Admins can update request items"
ON public.request_items FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Allow admin/sales to delete request items
CREATE POLICY "Admins can delete request items"
ON public.request_items FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Allow admin/sales to insert request items (for adding to existing orders)
CREATE POLICY "Admins can insert request items"
ON public.request_items FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
```

### Files to modify:
1. **Database migration** -- new migration with schema + RLS changes
2. **`supabase/functions/create-user/index.ts`** -- handle `unit` field
3. **`supabase/functions/manage-user/index.ts`** -- handle `unit` field in update
4. **`src/pages/admin/AdminUsers.tsx`** -- add Unit column, form fields
5. **`src/pages/admin/AdminOrders.tsx`** -- major update:
   - Fetch products list for adding items
   - Editable order detail dialog with inline editing of order info + items
   - Show inventory_id per item (from product join or stored on request_item)
   - Add/remove/edit items functionality
6. **`src/pages/Cart.tsx`** -- pre-fill unit from profile if needed

