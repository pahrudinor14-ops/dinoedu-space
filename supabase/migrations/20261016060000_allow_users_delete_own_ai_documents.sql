-- Allow signed-in users to delete their own generated documents.
revoke delete on table public.ai_documents from public, anon;
grant delete on table public.ai_documents to authenticated;

drop policy if exists ai_documents_delete_own on public.ai_documents;
create policy ai_documents_delete_own
  on public.ai_documents for delete to authenticated
  using (auth.uid() = user_id);
