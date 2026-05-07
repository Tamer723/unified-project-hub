-- Remove the placeholder vault secret — we now use service_role key for trigger->function auth
DO $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'internal_notify_secret';
  IF v_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_id;
  END IF;
END$$;

-- Trigger now sends the project's service_role key (read from vault) as Authorization
-- The service_role key is also available to edge functions as SUPABASE_SERVICE_ROLE_KEY env var,
-- so the edge function can compare incoming bearer to that env value.
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  fn_url text;
  v_key text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('paid', 'failed', 'cancelled', 'expired') THEN
    RETURN NEW;
  END IF;

  fn_url := 'https://ubzrshboajvdsztgptsk.supabase.co/functions/v1/notify-telegram';

  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Auth', COALESCE(v_key, '')
    ),
    body := jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
  );

  RETURN NEW;
END;
$function$;