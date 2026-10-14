-- Align configured daily allowances with the finalized DinoEdu product rules.
-- Review the remote schema and migration history before applying.
-- This updates plan configuration only; it does not activate subscriptions.

update public.dino_ai_plans
set daily_credits = case plan
  when 'free' then 5
  when 'community' then 15
  when 'paid' then 30
  else daily_credits
end
where plan in ('free', 'community', 'paid');

-- Verification query (run after applying):
-- select plan, daily_credits
-- from public.dino_ai_plans
-- where plan in ('free', 'community', 'paid')
-- order by plan;
