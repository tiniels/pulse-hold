
CREATE TABLE public.prontuarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prontuario text NOT NULL,
  nome text NOT NULL,
  nome_normalizado text,
  cargo text,
  cargo_normalizado text,
  secretaria text,
  observacao text,
  memorando text,
  telefone text,
  vinculo text,
  ano_ingresso integer,
  data_inicio date,
  sheet_origem text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX prontuarios_nome_norm_idx ON public.prontuarios(nome_normalizado);
CREATE INDEX prontuarios_pront_idx ON public.prontuarios(prontuario);
CREATE INDEX prontuarios_cargo_norm_idx ON public.prontuarios(cargo_normalizado);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prontuarios TO authenticated;
GRANT ALL ON public.prontuarios TO service_role;
ALTER TABLE public.prontuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prontuarios_auth_read" ON public.prontuarios FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "prontuarios_auth_write" ON public.prontuarios FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
