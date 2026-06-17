
CREATE TABLE public.evolucoes_funcionais (
  id BIGSERIAL PRIMARY KEY,
  matricula TEXT NOT NULL,
  nome TEXT NOT NULL,
  secretaria_codigo INT,
  secretaria_nome TEXT,
  data_admissao DATE,
  data_rescisao DATE,
  rescisao_codigo INT,
  rescisao_descricao TEXT,
  cargo_atual_codigo INT,
  cargo_atual_nome TEXT,
  vinculo_codigo INT,
  vinculo_nome TEXT,
  evolucao_cargo_codigo INT,
  evolucao_cargo_nome TEXT,
  evolucao_data DATE,
  evolucao_fundamento TEXT,
  fundamento_categoria TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_evolucoes_matricula ON public.evolucoes_funcionais(matricula);
CREATE INDEX idx_evolucoes_data ON public.evolucoes_funcionais(evolucao_data);
CREATE INDEX idx_evolucoes_categoria ON public.evolucoes_funcionais(fundamento_categoria);

GRANT SELECT ON public.evolucoes_funcionais TO anon, authenticated;
GRANT ALL ON public.evolucoes_funcionais TO service_role;

ALTER TABLE public.evolucoes_funcionais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read evolucoes" ON public.evolucoes_funcionais FOR SELECT USING (true);
CREATE POLICY "Service role manages evolucoes" ON public.evolucoes_funcionais FOR ALL TO service_role USING (true) WITH CHECK (true);
