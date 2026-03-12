
-- Add new statuses to the enum
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'processed';
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'on_delivery';
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'rejected';

-- Add shipping_address and business_account to requests
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS shipping_address text;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS business_account text;

-- Allow admins to delete requests
CREATE POLICY "Admins can delete requests" ON public.requests
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'sales'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
