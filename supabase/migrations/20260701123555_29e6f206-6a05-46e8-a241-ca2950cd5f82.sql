
-- ============ CERTAMES (normalized) ============
CREATE TABLE public.lev_certames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('CP','PS')),
  cargo TEXT NOT NULL,
  numero TEXT,
  ano INTEGER,
  secretaria TEXT,
  orgao TEXT,
  homologacao_status TEXT,
  prova_pratica TEXT,
  qtd_aprovados INTEGER DEFAULT 0,
  data_homologacao DATE,
  vencimento DATE,
  prorrogacao DATE,
  total_disponivel INTEGER DEFAULT 0,
  regularizar TEXT,
  pedidos_abertos INTEGER DEFAULT 0,
  pedidos_andamento INTEGER DEFAULT 0,
  memo TEXT,
  qtd_atendida INTEGER DEFAULT 0,
  desistencias_renuncias INTEGER DEFAULT 0,
  situacao TEXT DEFAULT 'em_andamento',
  observacoes TEXT,
  arquivado BOOLEAN NOT NULL DEFAULT FALSE,
  importacao_id UUID,
  row_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lev_certames TO authenticated;
GRANT ALL ON public.lev_certames TO service_role;
ALTER TABLE public.lev_certames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read lev_certames" ON public.lev_certames FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth write lev_certames" ON public.lev_certames FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE INDEX idx_lev_certames_tipo ON public.lev_certames(tipo);
CREATE INDEX idx_lev_certames_cargo ON public.lev_certames(cargo);
CREATE INDEX idx_lev_certames_situacao ON public.lev_certames(situacao);
CREATE INDEX idx_lev_certames_vencimento ON public.lev_certames(vencimento);

-- ============ IMPORTACOES ============
CREATE TABLE public.lev_importacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_nome TEXT NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'commit' CHECK (status IN ('preview','commit','rollback')),
  novos INTEGER DEFAULT 0,
  alterados INTEGER DEFAULT 0,
  removidos INTEGER DEFAULT 0,
  inalterados INTEGER DEFAULT 0,
  resumo JSONB,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lev_importacoes TO authenticated;
GRANT ALL ON public.lev_importacoes TO service_role;
ALTER TABLE public.lev_importacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all lev_importacoes" ON public.lev_importacoes FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============ HISTORICO (versionamento por certame) ============
CREATE TABLE public.lev_certames_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certame_id UUID,
  importacao_id UUID,
  versao INTEGER NOT NULL DEFAULT 1,
  snapshot JSONB NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lev_certames_historico TO authenticated;
GRANT ALL ON public.lev_certames_historico TO service_role;
ALTER TABLE public.lev_certames_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all lev_hist" ON public.lev_certames_historico FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE INDEX idx_lev_hist_certame ON public.lev_certames_historico(certame_id);
CREATE INDEX idx_lev_hist_import ON public.lev_certames_historico(importacao_id);

-- ============ AUDITORIA ============
CREATE TABLE public.lev_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID,
  usuario_email TEXT,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id UUID,
  valores_antigos JSONB,
  valores_novos JSONB,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lev_auditoria TO authenticated;
GRANT ALL ON public.lev_auditoria TO service_role;
ALTER TABLE public.lev_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all lev_audit" ON public.lev_auditoria FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE INDEX idx_lev_audit_entidade ON public.lev_auditoria(entidade, entidade_id);
CREATE INDEX idx_lev_audit_created ON public.lev_auditoria(created_at DESC);

-- ============ SIMULACOES (sandbox) ============
CREATE TABLE public.lev_simulacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  cenario JSONB NOT NULL,
  resultado JSONB,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lev_simulacoes TO authenticated;
GRANT ALL ON public.lev_simulacoes TO service_role;
ALTER TABLE public.lev_simulacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all lev_sim" ON public.lev_simulacoes FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.lev_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER trg_lev_certames_updated BEFORE UPDATE ON public.lev_certames FOR EACH ROW EXECUTE FUNCTION public.lev_touch_updated_at();
CREATE TRIGGER trg_lev_simulacoes_updated BEFORE UPDATE ON public.lev_simulacoes FOR EACH ROW EXECUTE FUNCTION public.lev_touch_updated_at();
