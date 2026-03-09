
-- Update RLS policies that reference 'admin' to reference 'sales'

-- attachments: "Admins can view all attachments"
DROP POLICY IF EXISTS "Admins can view all attachments" ON public.attachments;
CREATE POLICY "Admins can view all attachments" ON public.attachments FOR SELECT USING (
  has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- categories: "Admins can manage categories"
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (
  has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- companies: "Admins can manage companies"
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
CREATE POLICY "Admins can manage companies" ON public.companies FOR ALL USING (
  has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- products: "Admins can manage products"
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (
  has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- request_items: "Admins can view all request items"
DROP POLICY IF EXISTS "Admins can view all request items" ON public.request_items;
CREATE POLICY "Admins can view all request items" ON public.request_items FOR SELECT USING (
  has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- requests: "Admins can update requests"
DROP POLICY IF EXISTS "Admins can update requests" ON public.requests;
CREATE POLICY "Admins can update requests" ON public.requests FOR UPDATE USING (
  has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- requests: "Admins can view all requests"
DROP POLICY IF EXISTS "Admins can view all requests" ON public.requests;
CREATE POLICY "Admins can view all requests" ON public.requests FOR SELECT USING (
  has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Update handle_new_user trigger function to keep inserting 'buyer' (no change needed there)
