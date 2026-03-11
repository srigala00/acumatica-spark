

# Comprehensive Update Plan

This plan covers 6 changes: UI redesign to match mart.plnsc.co.id, product image management, new database columns, and renaming "request" to "order" with a new numbering format.

---

## 1. UI Redesign to Match mart.plnsc.co.id

Based on the reference site screenshot, the design features:
- Top bar: teal/cyan gradient strip, "Customer Service" + phone number
- Logo: PLN Suku Cadang logo (lightning bolt + "PLN Suku Cadang" text) — we'll replicate this with similar styling using the teal brand color
- Search bar with "All Categories" dropdown
- Navigation: HOME, CONTACT US, ABOUT US, QUOTATION, BRAND links
- Category grid with icon circles

**Files to modify:**
- `src/components/layout/Header.tsx` — Redesign to match: top cyan bar, PLN-style logo, category dropdown in search, nav links (HOME, CONTACT US, ABOUT US, QUOTATION, BRAND)
- `src/components/home/HeroBanner.tsx` — Update text to "PLN Suku Cadang" branding
- `src/components/layout/Footer.tsx` — Update branding from "SpareParts.mart" to "PLN Suku Cadang"
- `src/components/layout/AdminSidebar.tsx` — Update logo text
- `src/index.css` — Keep existing color scheme (already teal/cyan primary)

## 2. Product Image Management in Admin

Add image upload capability to the product add/edit dialog in `AdminProducts.tsx`:
- Add a file input for image upload in the product form
- Upload images to the existing `product-images` storage bucket
- Store the public URL in `products.image_url`
- Show image thumbnail in the product table
- Allow replacing/removing images on edit

**Files to modify:**
- `src/pages/admin/AdminProducts.tsx` — Add image upload field, thumbnail preview in table, upload logic using `supabase.storage.from('product-images')`

## 3. Add `inventory_id` Column to Products

Add a new nullable text column `inventory_id` to the `products` table. This field will only be visible in the admin panel (in the product table and edit form), not on the public-facing product pages.

**Database migration:**
```sql
ALTER TABLE public.products ADD COLUMN inventory_id text;
```

**Files to modify:**
- `src/pages/admin/AdminProducts.tsx` — Add inventory_id field to form and table display
- Product import template updated to include inventory_id column

## 4. Add `business_account` and `location` Columns to Profiles

Add two new nullable text columns to the `profiles` table for customer data.

**Database migration:**
```sql
ALTER TABLE public.profiles ADD COLUMN business_account text;
ALTER TABLE public.profiles ADD COLUMN location text;
```

**Files to modify:**
- `src/pages/admin/AdminUsers.tsx` — Show business_account and location in the users table, add fields to add user form
- User import template updated to include these columns

## 5. Rename "Request" to "Order" Throughout

Rename all UI labels from "Request/RFQ" to "Order" across all pages. The database table name stays `requests` to avoid breaking changes, but all user-facing text changes.

**Files to modify (UI text only):**
- `src/pages/BuyerRequests.tsx` → Rename to `src/pages/BuyerOrders.tsx`, update all text: "My Requests" → "My Orders", "New Request" → "New Order"
- `src/pages/RFQSubmission.tsx` → Rename to `src/pages/OrderSubmission.tsx`, "Submit Request for Quotation" → "Submit Order"
- `src/pages/BuyerDashboard.tsx` — "Submit New RFQ" → "Submit New Order", "View My Requests" → "View My Orders"
- `src/pages/admin/AdminRequests.tsx` → Rename to `src/pages/admin/AdminOrders.tsx`, "Requests" → "Orders"
- `src/pages/admin/AdminDashboard.tsx` — "Total Requests" → "Total Orders", "Monthly Request Volume" → "Monthly Order Volume", "Recent Requests" → "Recent Orders"
- `src/components/layout/Header.tsx` — "My Requests" → "My Orders"
- `src/components/layout/AdminSidebar.tsx` — "Requests" → "Orders"
- `src/App.tsx` — Update route paths: `/rfq` → `/order`, `/requests` → `/orders`, `/admin/requests` → `/admin/orders`
- `src/pages/ProductDetail.tsx` — "Request Quotation" → "Order Now"
- `src/components/home/FeaturedProducts.tsx` — Any RFQ text
- `src/pages/Index.tsx` — Any RFQ text

## 6. New Order Number Format: MART[YY]-[6 digits]

Change the auto-generated number from `RFQ-000001` to `MART25-000001` format.

**Database migration:**
```sql
-- Update the trigger function
CREATE OR REPLACE FUNCTION public.generate_request_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.request_number = 'MART' || TO_CHAR(NOW(), 'YY') || '-' || LPAD(nextval('public.request_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$function$;
```

No code changes needed beyond the trigger — the format is generated server-side.

---

## Summary of Database Migrations

```sql
-- Migration 1: Add inventory_id to products
ALTER TABLE public.products ADD COLUMN inventory_id text;

-- Migration 2: Add business_account and location to profiles  
ALTER TABLE public.profiles ADD COLUMN business_account text;
ALTER TABLE public.profiles ADD COLUMN location text;

-- Migration 3: Update order number format
CREATE OR REPLACE FUNCTION public.generate_request_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.request_number = 'MART' || TO_CHAR(NOW(), 'YY') || '-' || LPAD(nextval('public.request_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$function$;
```

## Files to Create/Modify

**Create:**
- `src/pages/BuyerOrders.tsx` (replaces BuyerRequests.tsx)
- `src/pages/OrderSubmission.tsx` (replaces RFQSubmission.tsx)
- `src/pages/admin/AdminOrders.tsx` (replaces AdminRequests.tsx)

**Modify:**
- `src/App.tsx` — Updated routes and imports
- `src/components/layout/Header.tsx` — PLN Suku Cadang branding + nav redesign
- `src/components/layout/Footer.tsx` — Updated branding
- `src/components/layout/AdminSidebar.tsx` — "Orders" label + logo
- `src/components/home/HeroBanner.tsx` — Updated branding
- `src/pages/admin/AdminProducts.tsx` — Image upload + inventory_id field
- `src/pages/admin/AdminUsers.tsx` — business_account + location fields
- `src/pages/admin/AdminDashboard.tsx` — "Orders" labels
- `src/pages/BuyerDashboard.tsx` — "Orders" labels
- `src/pages/ProductDetail.tsx` — "Order" button text
- `src/pages/Index.tsx` — Updated text

**Delete (replaced by new files):**
- `src/pages/BuyerRequests.tsx`
- `src/pages/RFQSubmission.tsx`
- `src/pages/admin/AdminRequests.tsx`

