

## Plan: Auto-populate business_account dari profiles saat submit order

### Masalah
- `Cart.tsx` sudah mengisi `business_account` dari form (yang diambil dari profile).
- `OrderSubmission.tsx` **tidak** menyertakan `business_account` saat insert ke tabel `requests`.

### Pendekatan
Daripada menambah field di form, gunakan **database trigger** yang otomatis mengisi `business_account` pada tabel `requests` dari tabel `profiles` berdasarkan `user_id`. Ini memastikan kedua flow (Cart dan OrderSubmission) selalu konsisten tanpa perlu perubahan di banyak file.

### Perubahan

1. **Database migration** — Buat trigger `set_business_account_from_profile` pada tabel `requests`:
   - Pada `BEFORE INSERT`, ambil `business_account` dari `profiles` berdasarkan `NEW.user_id`.
   - Set `NEW.business_account` dengan nilai tersebut.
   - Ini memastikan setiap order baru otomatis mendapat `business_account` yang benar dari profile user.

2. **`src/pages/OrderSubmission.tsx`** — Tidak perlu diubah (trigger akan handle otomatis).

3. **`src/pages/Cart.tsx`** — Opsional: bisa hapus manual assignment `business_account: form.businessAccount` karena trigger sudah handle, tapi tidak wajib (trigger akan overwrite).

### SQL Trigger
```sql
CREATE OR REPLACE FUNCTION public.set_request_business_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  SELECT business_account INTO NEW.business_account
  FROM public.profiles
  WHERE user_id = NEW.user_id
  LIMIT 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_business_account
BEFORE INSERT ON public.requests
FOR EACH ROW
EXECUTE FUNCTION public.set_request_business_account();
```

