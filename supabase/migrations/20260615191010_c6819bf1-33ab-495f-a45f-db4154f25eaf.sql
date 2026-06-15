CREATE TABLE IF NOT EXISTS public.concursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('CP','PS')),
  numero text NOT NULL,
  nome text,
  data_realizacao date,
  data_homologacao date,
  data_vencimento date,
  prorrogado_ate date,
  sheet_origem text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo, numero)
);
GRANT SELECT ON public.concursos TO anon, authenticated;
GRANT ALL ON public.concursos TO service_role;
ALTER TABLE public.concursos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read concursos" ON public.concursos FOR SELECT USING (true);
CREATE POLICY "Auth write concursos" ON public.concursos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.cargos_fila (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concurso_id uuid NOT NULL REFERENCES public.concursos(id) ON DELETE CASCADE,
  codigo text,
  nome_original text NOT NULL,
  nome_normalizado text NOT NULL,
  secao text NOT NULL DEFAULT 'FINAL' CHECK (secao IN ('ESPECIAL','FINAL'))
);
CREATE INDEX IF NOT EXISTS idx_cargos_norm ON public.cargos_fila(nome_normalizado);
CREATE INDEX IF NOT EXISTS idx_cargos_conc ON public.cargos_fila(concurso_id);
GRANT SELECT ON public.cargos_fila TO anon, authenticated;
GRANT ALL ON public.cargos_fila TO service_role;
ALTER TABLE public.cargos_fila ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read cargos_fila" ON public.cargos_fila FOR SELECT USING (true);
CREATE POLICY "Auth write cargos_fila" ON public.cargos_fila FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.candidatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo_fila_id uuid NOT NULL REFERENCES public.cargos_fila(id) ON DELETE CASCADE,
  inscricao text,
  nome text NOT NULL,
  documento text,
  nota numeric,
  classificacao integer,
  lista_tipo text NOT NULL DEFAULT 'GERAL' CHECK (lista_tipo IN ('GERAL','PCD','MSVD')),
  data_convocacao date,
  status text NOT NULL DEFAULT 'DISPONIVEL' CHECK (status IN ('DISPONIVEL','CONVOCADO','DESISTENTE','SEM_EFEITO','NOTIFICADO','APROVADO','REPROVADO')),
  observacao text,
  ordem_linha integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cand_cargo ON public.candidatos(cargo_fila_id);
CREATE INDEX IF NOT EXISTS idx_cand_status ON public.candidatos(status);
CREATE INDEX IF NOT EXISTS idx_cand_lista ON public.candidatos(lista_tipo);
GRANT SELECT ON public.candidatos TO anon, authenticated;
GRANT ALL ON public.candidatos TO service_role;
ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read candidatos" ON public.candidatos FOR SELECT USING (true);
CREATE POLICY "Auth write candidatos" ON public.candidatos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.convocacoes_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id uuid NOT NULL REFERENCES public.candidatos(id) ON DELETE CASCADE,
  acao text NOT NULL,
  status_anterior text,
  status_novo text,
  usuario_id uuid,
  usuario_email text,
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_log_cand ON public.convocacoes_log(candidato_id);
GRANT SELECT ON public.convocacoes_log TO anon, authenticated;
GRANT ALL ON public.convocacoes_log TO service_role;
ALTER TABLE public.convocacoes_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read log" ON public.convocacoes_log FOR SELECT USING (true);
CREATE POLICY "Auth write log" ON public.convocacoes_log FOR ALL TO authenticated USING (true) WITH CHECK (true);