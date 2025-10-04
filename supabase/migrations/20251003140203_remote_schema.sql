alter table "public"."user_addresses" alter column "id" set default extensions.uuid_generate_v4();

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- If setting this address as default, unset all other defaults for this user
    IF NEW.is_default = true THEN
        UPDATE user_addresses 
        SET is_default = false 
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_default_address(input_user_id uuid)
 RETURNS TABLE(id uuid, type character varying, custom_tag character varying, house_number character varying, apartment_road character varying, complete_address text, latitude numeric, longitude numeric, phone character varying, display_type text, short_address text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        ua.id,
        ua.type,
        ua.custom_tag,
        ua.house_number,
        ua.apartment_road,
        ua.complete_address,
        ua.latitude,
        ua.longitude,
        ua.phone,
        uad.display_type,
        uad.short_address
    FROM public.user_addresses ua
    JOIN public.user_addresses_display uad ON ua.id = uad.id
    WHERE ua.user_id = input_user_id 
    AND ua.is_default = TRUE
    LIMIT 1;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_cart_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_addresses_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_otp_verification(p_phone text, p_otp text, p_expires_at timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  result_id UUID;
BEGIN
  -- Try to update existing record first
  UPDATE otp_verification 
  SET 
    otp = p_otp,
    expires_at = p_expires_at,
    verified = FALSE,
    attempts = 0,
    created_at = NOW(),
    verified_at = NULL
  WHERE phone = p_phone
  RETURNING id INTO result_id;
  
  -- If no record was updated, insert a new one
  IF NOT FOUND THEN
    INSERT INTO otp_verification (phone, otp, expires_at, verified, attempts, created_at)
    VALUES (p_phone, p_otp, p_expires_at, FALSE, 0, NOW())
    RETURNING id INTO result_id;
  END IF;
  
  RETURN result_id;
END;
$function$
;



