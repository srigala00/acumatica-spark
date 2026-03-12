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