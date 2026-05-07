-- 1) Store INTERNAL_NOTIFY_SECRET in vault (placeholder; real value lives in edge function env)
-- We re-create with a fixed name so trigger can read it.
DO $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'internal_notify_secret';
  IF v_id IS NULL THEN
    PERFORM vault.create_secret('CHANGE_ME_VIA_EDGE_FUNCTION_ENV', 'internal_notify_secret', 'Shared secret used by DB triggers to authenticate to notify-telegram edge function');
  END IF;
END$$;

-- 2) Update the trigger to send X-Internal-Secret header
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  fn_url text;
  v_secret text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('paid', 'failed', 'cancelled', 'expired') THEN
    RETURN NEW;
  END IF;

  fn_url := 'https://ubzrshboajvdsztgptsk.supabase.co/functions/v1/notify-telegram';

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'internal_notify_secret'
  LIMIT 1;

  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Internal-Secret', COALESCE(v_secret, '')
    ),
    body := jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
  );

  RETURN NEW;
END;
$function$;

-- 3) Tighten EXECUTE on SECURITY DEFINER functions
-- Trigger-only functions: revoke from public roles entirely.
REVOKE ALL ON FUNCTION public.notify_order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_order_fields() FROM PUBLIC, anon, authenticated;

-- Internal helpers: revoke from anon/public; keep authenticated (RLS may call)
REVOKE ALL ON FUNCTION public.increment_raised(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_active_payment_provider() FROM PUBLIC, anon;

-- Role helpers: needed in RLS policies for authenticated users; revoke from anon
REVOKE ALL ON FUNCTION public.has_role(public.user_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_any_role(public.user_role[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(public.user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(public.user_role[]) TO authenticated;