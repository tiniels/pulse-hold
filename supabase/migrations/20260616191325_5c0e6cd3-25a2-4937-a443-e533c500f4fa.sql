
CREATE TABLE public.rescisoes (
  id BIGSERIAL PRIMARY KEY,
  matricula TEXT,
  nome TEXT NOT NULL,
  secretaria_codigo INT,
  secretaria_nome TEXT NOT NULL,
  data_admissao DATE NOT NULL,
  data_rescisao DATE NOT NULL,
  rescisao_codigo INT NOT NULL,
  rescisao_descricao TEXT NOT NULL,
  cargo_codigo INT,
  cargo_nome TEXT NOT NULL,
  vinculo_nome TEXT NOT NULL,
  motivo_categoria TEXT NOT NULL,
  vinculo_categoria TEXT NOT NULL,
  dias_permanencia INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rescisoes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rescisoes TO authenticated;
GRANT ALL ON public.rescisoes TO service_role;

ALTER TABLE public.rescisoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de rescisões" ON public.rescisoes FOR SELECT USING (true);
CREATE POLICY "Autenticados podem gerenciar rescisões" ON public.rescisoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_rescisoes_data_rescisao ON public.rescisoes(data_rescisao);
CREATE INDEX idx_rescisoes_vinculo_cat ON public.rescisoes(vinculo_categoria);
CREATE INDEX idx_rescisoes_motivo_cat ON public.rescisoes(motivo_categoria);
CREATE INDEX idx_rescisoes_secretaria ON public.rescisoes(secretaria_nome);
CREATE INDEX idx_rescisoes_cargo ON public.rescisoes(cargo_nome);
