
CREATE OR REPLACE FUNCTION public.generate_request_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  current_yy TEXT;
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
$function$;
