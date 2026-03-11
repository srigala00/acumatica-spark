
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS inventory_id text;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_account text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location text;

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
