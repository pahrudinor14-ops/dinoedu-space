-- Accounts with a verified MFA factor must use an AAL2 session to access
-- private DinoAI conversations and generated documents. Users who have not
-- opted in to MFA can continue using AAL1 sessions.
do $migration$
declare
  protected_table text;
  policy_name text;
begin
  foreach protected_table in array array[
    'dinoai_chat_conversations',
    'ai_documents'
  ] loop
    policy_name := protected_table || '_require_mfa_step_up';
    execute format('drop policy if exists %I on public.%I', policy_name, protected_table);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated
       using (
         case
           when exists (
             select 1
             from auth.mfa_factors as factor
             where factor.user_id = (select auth.uid())
               and factor.status = ''verified''
           ) then (select auth.jwt() ->> ''aal'') = ''aal2''
           else (select auth.jwt() ->> ''aal'') in (''aal1'', ''aal2'')
         end
       )
       with check (
         case
           when exists (
             select 1
             from auth.mfa_factors as factor
             where factor.user_id = (select auth.uid())
               and factor.status = ''verified''
           ) then (select auth.jwt() ->> ''aal'') = ''aal2''
           else (select auth.jwt() ->> ''aal'') in (''aal1'', ''aal2'')
         end
       )',
      policy_name,
      protected_table
    );
  end loop;
end;
$migration$;
