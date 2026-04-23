-- =====================================================================
-- DATABASE SCHEMA SNAPSHOT
-- Project: MART PLN SC
-- Generated: 2026-04-23
--
-- This file is a REFERENCE SNAPSHOT of the current database structure.
-- It is NOT executed automatically. Use it for:
--   - Documentation
--   - Manual restore to another PostgreSQL instance
--   - Reviewing the full schema in one place
--
-- The live source of truth is the database itself + supabase/migrations/
-- =====================================================================


-- =====================================================================
-- 1. ENUMS
-- =====================================================================

CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'admin',
  'buyer',
  'sales'
);

CREATE TYPE public.request_status AS ENUM (
  'submitted',
  'sent_to_erp',
  'in_review',
  'closed',
  'processed',
  'on_delivery',
  'completed',
  'rejected'
);


-- =====================================================================
-- 2. TABLES
-- =====================================================================

-- ---------- companies ----------
CREATE TABLE public.companies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  address    TEXT,
  phone      TEXT,
  email      TEXT,
  website    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- profiles ----------
CREATE TABLE public.profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL,
  full_name         TEXT NOT NULL,
  phone             TEXT,
  company_id        UUID REFERENCES public.companies(id),
  company_name      TEXT,
  business_account  TEXT,
  location          TEXT,
  unit              TEXT,
  avatar_url        TEXT,
  status            TEXT NOT NULL DEFAULT 'active',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- user_roles ----------
CREATE TABLE public.user_roles (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role    public.app_role NOT NULL DEFAULT 'buyer',
  UNIQUE (user_id, role)
);

-- ---------- categories ----------
CREATE TABLE public.categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  icon        TEXT,
  parent_id   UUID REFERENCES public.categories(id),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- products ----------
CREATE TABLE public.products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku             TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  brand           TEXT,
  category_id     UUID REFERENCES public.categories(id),
  image_url       TEXT,
  specifications  JSONB,
  estimated_price NUMERIC,
  inventory_id    TEXT,
  stock_indicator TEXT DEFAULT 'available',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- requests ----------
CREATE TABLE public.requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number     TEXT NOT NULL UNIQUE,  -- format: MARTYY-XXXXXX
  user_id            UUID NOT NULL,
  company_name       TEXT NOT NULL,
  contact_person     TEXT NOT NULL,
  email              TEXT NOT NULL,
  phone              TEXT,
  business_account   TEXT,
  shipping_address   TEXT,
  description        TEXT,
  status             public.request_status NOT NULL DEFAULT 'submitted',
  erp_opportunity_id TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- request_items ----------
CREATE TABLE public.request_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES public.products(id),
  product_name  TEXT NOT NULL,
  sku           TEXT,
  inventory_id  TEXT,
  quantity      INTEGER NOT NULL DEFAULT 1,
  unit_price    NUMERIC,
  specification TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- attachments ----------
CREATE TABLE public.attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID REFERENCES public.requests(id) ON DELETE CASCADE,
  request_item_id UUID REFERENCES public.request_items(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  file_size       INTEGER,
  content_type    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =====================================================================
-- 3. FUNCTIONS
-- =====================================================================

-- ---------- has_role ----------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ---------- update_updated_at_column ----------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------- handle_new_user ----------
-- Auto-creates a profile + 'buyer' role when a new auth user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'buyer');

  RETURN NEW;
END;
$$;

-- ---------- generate_request_number ----------
-- Generates MARTYY-XXXXXX (resets each year).
CREATE OR REPLACE FUNCTION public.generate_request_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  current_yy  TEXT;
  last_number INT;
  next_number INT;
BEGIN
  current_yy := TO_CHAR(NOW(), 'YY');

  SELECT COALESCE(
    MAX(CAST(SUBSTRING(request_number FROM 8 FOR 6) AS INT)),
    0
  ) INTO last_number
  FROM public.requests
  WHERE request_number LIKE 'MART' || current_yy || '-%';

  next_number := last_number + 1;

  NEW.request_number := 'MART' || current_yy || '-' || LPAD(next_number::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

-- ---------- set_request_business_account ----------
-- Copies business_account + company_name from the user's profile into the request.
CREATE OR REPLACE FUNCTION public.set_request_business_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  SELECT business_account, company_name
  INTO NEW.business_account, NEW.company_name
  FROM public.profiles
  WHERE user_id = NEW.user_id
  LIMIT 1;
  RETURN NEW;
END;
$$;


-- =====================================================================
-- 4. TRIGGERS
-- =====================================================================

-- New auth user → create profile + role
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-generate request_number
CREATE TRIGGER before_insert_request_number
  BEFORE INSERT ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.generate_request_number();

-- Auto-fill business_account / company_name from profile
CREATE TRIGGER before_insert_request_business_account
  BEFORE INSERT ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.set_request_business_account();

-- Updated_at maintenance
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- =====================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================================

ALTER TABLE public.companies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments   ENABLE ROW LEVEL SECURITY;


-- ---------- companies ----------
CREATE POLICY "Companies viewable by authenticated users"
  ON public.companies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage companies"
  ON public.companies FOR ALL
  USING (public.has_role(auth.uid(), 'sales') OR public.has_role(auth.uid(), 'super_admin'));


-- ---------- profiles ----------
CREATE POLICY "Profiles viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));


-- ---------- user_roles ----------
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));


-- ---------- categories ----------
CREATE POLICY "Categories viewable by everyone"
  ON public.categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.has_role(auth.uid(), 'sales') OR public.has_role(auth.uid(), 'super_admin'));


-- ---------- products ----------
CREATE POLICY "Active products viewable by everyone"
  ON public.products FOR SELECT USING (true);

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (
    public.has_role(auth.uid(), 'sales')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'sales')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
  );


-- ---------- requests ----------
CREATE POLICY "Users can view own requests"
  ON public.requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create requests"
  ON public.requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests"
  ON public.requests FOR SELECT
  USING (public.has_role(auth.uid(), 'sales') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update requests"
  ON public.requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'sales') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete requests"
  ON public.requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'sales') OR public.has_role(auth.uid(), 'super_admin'));


-- ---------- request_items ----------
CREATE POLICY "Users can view own request items"
  ON public.request_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = request_items.request_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "Users can create request items"
  ON public.request_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = request_items.request_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all request items"
  ON public.request_items FOR SELECT
  USING (public.has_role(auth.uid(), 'sales') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert request items"
  ON public.request_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'sales') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update request items"
  ON public.request_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'sales') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete request items"
  ON public.request_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'sales') OR public.has_role(auth.uid(), 'super_admin'));


-- ---------- attachments ----------
CREATE POLICY "Users can view own attachments"
  ON public.attachments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = attachments.request_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "Users can upload attachments"
  ON public.attachments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = attachments.request_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all attachments"
  ON public.attachments FOR SELECT
  USING (public.has_role(auth.uid(), 'sales') OR public.has_role(auth.uid(), 'super_admin'));


-- =====================================================================
-- 6. STORAGE BUCKETS
-- =====================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('request-attachments', 'request-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (examples — adjust to match live policies if needed)

-- product-images: public read, admin write
CREATE POLICY "Product images publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Admins can manage product images"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'product-images'
    AND (public.has_role(auth.uid(), 'sales')
      OR public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'admin'))
  );

-- request-attachments: private (owner + admins)
CREATE POLICY "Users can upload their own request attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'request-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read their own request attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'request-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can read all request attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'request-attachments'
    AND (public.has_role(auth.uid(), 'sales')
      OR public.has_role(auth.uid(), 'super_admin'))
  );


-- =====================================================================
-- END OF SCHEMA SNAPSHOT
-- =====================================================================