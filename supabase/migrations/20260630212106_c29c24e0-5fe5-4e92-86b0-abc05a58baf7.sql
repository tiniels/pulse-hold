
CREATE TABLE public.chamamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secretaria text NOT NULL,
  numero text,
  memo_os text,
  data_memo date,
  motivo text,
  cargo text,
  cargo_normalizado text,
  prazo_contrato text,
  regularizar_concurso text,
  data_publicacao date,
  numero_concurso text,
  tipo_concurso text,
  classificacao text,
  classificacao_num int,
  cota text,
  nome text,
  responsavel text,
  prontuario text,
  data_inicio date,
  observacao text,
  status text NOT NULL DEFAULT 'EM_ANDAMENTO',
  ano_publicacao int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chamamentos_secretaria ON public.chamamentos(secretaria);
CREATE INDEX idx_chamamentos_status ON public.chamamentos(status);
CREATE INDEX idx_chamamentos_concurso ON public.chamamentos(numero_concurso);
CREATE INDEX idx_chamamentos_cargo ON public.chamamentos(cargo_normalizado);
CREATE INDEX idx_chamamentos_data_pub ON public.chamamentos(data_publicacao);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chamamentos TO authenticated;
GRANT ALL ON public.chamamentos TO service_role;
ALTER TABLE public.chamamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read chamamentos" ON public.chamamentos FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth write chamamentos" ON public.chamamentos FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE public.chamamentos_andamento_2026 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secretaria text NOT NULL,
  quantidade int,
  cargo text,
  cargo_normalizado text,
  andamento text,
  fase_kanban int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chamamentos_andamento_2026 TO authenticated;
GRANT ALL ON public.chamamentos_andamento_2026 TO service_role;
ALTER TABLE public.chamamentos_andamento_2026 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read andamento" ON public.chamamentos_andamento_2026 FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth write andamento" ON public.chamamentos_andamento_2026 FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
