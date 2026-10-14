
CREATE OR REPLACE FUNCTION public.get_dino_ai_wallet_balance()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT COALESCE(SUM(l.remaining_credits), 0)::integer
  FROM public.dino_ai_credit_lots AS l
  WHERE l.user_id = auth.uid()
    AND l.source = 'purchase'
    AND l.remaining_credits > 0
    AND (l.expires_at IS NULL OR l.expires_at > now());
$function$;

REVOKE ALL ON FUNCTION public.get_dino_ai_wallet_balance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dino_ai_wallet_balance() TO authenticated;
