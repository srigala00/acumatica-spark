
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
