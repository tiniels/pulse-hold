
ALTER TABLE public.evolucoes_funcionais
  ADD COLUMN IF NOT EXISTS secretaria text,
  ADD COLUMN IF NOT EXISTS sigla text,
  ADD COLUMN IF NOT EXISTS cargo_conciliacao text;

CREATE INDEX IF NOT EXISTS idx_evolucoes_secretaria ON public.evolucoes_funcionais (secretaria);
CREATE INDEX IF NOT EXISTS idx_evolucoes_sigla ON public.evolucoes_funcionais (sigla);
CREATE INDEX IF NOT EXISTS idx_evolucoes_cargo_conc ON public.evolucoes_funcionais (cargo_conciliacao);
