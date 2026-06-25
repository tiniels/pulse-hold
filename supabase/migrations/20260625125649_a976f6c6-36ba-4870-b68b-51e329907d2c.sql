
CREATE TABLE public.admissoes (
  id BIGSERIAL PRIMARY KEY,
  prontuario TEXT,
  nome TEXT NOT NULL,
  cargo TEXT,
  secretaria TEXT,
  observacao TEXT,
  memorando TEXT,
  telefone TEXT,
  vinculo TEXT,
  vinculo_categoria TEXT,
  tipo_movimentacao TEXT,
  data_header DATE,
  data_efetiva DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admissoes_pront ON public.admissoes(prontuario);
CREATE INDEX idx_admissoes_data ON public.admissoes(data_efetiva);
CREATE INDEX idx_admissoes_sec ON public.admissoes(secretaria);
CREATE INDEX idx_admissoes_vinc ON public.admissoes(vinculo_categoria);

GRANT SELECT ON public.admissoes TO anon, authenticated;
GRANT ALL ON public.admissoes TO service_role;

ALTER TABLE public.admissoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read admissoes" ON public.admissoes FOR SELECT USING (true);
