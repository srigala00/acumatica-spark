ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unit text;

ALTER TABLE public.request_items ADD COLUMN IF NOT EXISTS inventory_id text;

CREATE POLICY "Admins can update request items"
ON public.request_items FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete request items"
ON public.request_items FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can insert request items"
ON public.request_items FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));