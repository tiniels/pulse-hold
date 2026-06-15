
CREATE TABLE public.concurso_publico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cargo TEXT NOT NULL,
  numero TEXT,
  homologacao_status TEXT,
  prova_pratica TEXT,
  qtd_aprovados INT,
  data_homologacao DATE,
  vencimento DATE,
  prorrogacao DATE,
  total_disponivel INT NOT NULL DEFAULT 0,
  regularizar TEXT,
  pedidos_abertos INT,
  pedidos_andamento INT,
  memo TEXT,
  qtd_atendida INT,
  desistencias_renuncias INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.concurso_publico TO authenticated;
GRANT SELECT ON public.concurso_publico TO anon;
GRANT ALL ON public.concurso_publico TO service_role;
ALTER TABLE public.concurso_publico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read CP" ON public.concurso_publico FOR SELECT USING (true);
CREATE POLICY "Auth write CP" ON public.concurso_publico FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.processo_seletivo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cargo TEXT NOT NULL,
  numero TEXT,
  homologacao_status TEXT,
  qtd_aprovados INT,
  data_homologacao DATE,
  vencimento DATE,
  prorrogacao DATE,
  total_disponivel INT NOT NULL DEFAULT 0,
  pedidos_abertos INT,
  pedidos_andamento INT,
  memo TEXT,
  qtd_atendida INT,
  desistencias_renuncias INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.processo_seletivo TO authenticated;
GRANT SELECT ON public.processo_seletivo TO anon;
GRANT ALL ON public.processo_seletivo TO service_role;
ALTER TABLE public.processo_seletivo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read PS" ON public.processo_seletivo FOR SELECT USING (true);
CREATE POLICY "Auth write PS" ON public.processo_seletivo FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.vencimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  cargo TEXT NOT NULL,
  numero TEXT,
  data_homologacao DATE,
  vencimento_original DATE,
  prorrogacao DATE,
  data_alvo DATE,
  dias_restantes INT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vencimentos TO authenticated;
GRANT SELECT ON public.vencimentos TO anon;
GRANT ALL ON public.vencimentos TO service_role;
ALTER TABLE public.vencimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read venc" ON public.vencimentos FOR SELECT USING (true);
CREATE POLICY "Auth write venc" ON public.vencimentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
