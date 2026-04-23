

## Plan: Generate `schema.sql` Snapshot File

Buat file `schema.sql` lengkap di folder root project yang berisi snapshot skema database saat ini. File ini akan jadi referensi tunggal untuk semua struktur database.

### Isi File `schema.sql`

File akan dibuat di lokasi: **`supabase/schema.sql`**

Konten mencakup:

1. **Enums**
   - `app_role` (buyer, sales, admin, super_admin)
   - `request_status` (submitted, dll)

2. **Tables** (CREATE TABLE statements lengkap dengan kolom, tipe data, default, dan constraints)
   - `profiles` (termasuk business_account, company_name, location, unit)
   - `user_roles`
   - `categories`
   - `companies`
   - `products` (termasuk inventory_id, estimated_price, image_url)
   - `requests` (termasuk request_number, business_account, shipping_address)
   - `request_items` (termasuk unit_price, inventory_id)
   - `attachments`

3. **Functions** (semua 5 database functions yang ada)
   - `has_role(uuid, app_role)`
   - `handle_new_user()`
   - `generate_request_number()` — format MART YY-XXXXXX
   - `set_request_business_account()`
   - `update_updated_at_column()`

4. **Triggers** (untuk attach functions ke tables)
   - Trigger `on_auth_user_created` di `auth.users` → `handle_new_user()`
   - Trigger `before_insert_request_number` di `requests` → `generate_request_number()`
   - Trigger `before_insert_request_business_account` di `requests` → `set_request_business_account()`
   - Trigger `update_updated_at` di tabel-tabel relevan

5. **RLS Policies** (semua policies dari setiap tabel — admin manage, users view own, dll)

6. **Storage Buckets**
   - `product-images` (public)
   - `request-attachments` (private)

### Catatan

- File ini adalah **snapshot referensi**, bukan migration yang akan dieksekusi
- Bisa dipakai untuk: dokumentasi, restore manual ke PostgreSQL lain, atau review struktur
- Tidak akan mengubah database aktif

