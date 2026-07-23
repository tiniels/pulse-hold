CREATE TABLE public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_email text,
  acao text not null,
  entidade text not null,
  filtros jsonb,
  detalhes jsonb,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_insert_own" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "audit_log_select_staff" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE INDEX audit_log_created_at_idx ON public.audit_log (created_at DESC);
CREATE INDEX audit_log_user_idx ON public.audit_log (user_id, created_at DESC);