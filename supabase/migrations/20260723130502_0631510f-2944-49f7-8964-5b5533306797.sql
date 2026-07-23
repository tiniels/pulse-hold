
-- 1. Quadro Autorizado (fonte governada, inicia vazia)
CREATE TABLE public.dim_quadro_autorizado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo_id uuid NOT NULL REFERENCES public.dim_cargo(id) ON DELETE CASCADE,
  secretaria_id uuid REFERENCES public.dim_secretaria(id) ON DELETE SET NULL,
  quantidade_autorizada integer NOT NULL CHECK (quantidade_autorizada >= 0),
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  fonte text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_dim_quadro_autorizado_cargo ON public.dim_quadro_autorizado(cargo_id);
CREATE INDEX idx_dim_quadro_autorizado_secretaria ON public.dim_quadro_autorizado(secretaria_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dim_quadro_autorizado TO authenticated;
GRANT ALL ON public.dim_quadro_autorizado TO service_role;

ALTER TABLE public.dim_quadro_autorizado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access" ON public.dim_quadro_autorizado
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER trg_dim_quadro_autorizado_upd
  BEFORE UPDATE ON public.dim_quadro_autorizado
  FOR EACH ROW EXECUTE FUNCTION public.lev_touch_updated_at();

-- 2. Integração /levantamento com MDM
ALTER TABLE public.lev_certames
  ADD COLUMN cargo_id uuid REFERENCES public.dim_cargo(id) ON DELETE SET NULL,
  ADD COLUMN secretaria_id uuid REFERENCES public.dim_secretaria(id) ON DELETE SET NULL;

CREATE INDEX idx_lev_certames_cargo_id ON public.lev_certames(cargo_id);
CREATE INDEX idx_lev_certames_secretaria_id ON public.lev_certames(secretaria_id);

-- Backfill: match exato pelo nome canônico
UPDATE public.lev_certames c
SET cargo_id = dc.id
FROM public.dim_cargo dc
WHERE c.cargo_id IS NULL
  AND public.norm_txt(dc.nome) = public.norm_txt(c.cargo);

-- Backfill: match pelo prefixo antes de " - " (ex.: "Agente Comunitário de Saúde - Ingaí")
UPDATE public.lev_certames c
SET cargo_id = dc.id
FROM public.dim_cargo dc
WHERE c.cargo_id IS NULL
  AND public.norm_txt(dc.nome) = public.norm_txt(split_part(c.cargo, ' - ', 1));

-- Backfill: aliases revisados
UPDATE public.lev_certames c
SET cargo_id = a.cargo_id
FROM public.dim_cargo_alias a
WHERE c.cargo_id IS NULL
  AND a.cargo_id IS NOT NULL
  AND a.texto_origem_norm = public.norm_txt(c.cargo);

-- Backfill secretaria
UPDATE public.lev_certames c
SET secretaria_id = a.secretaria_id
FROM public.dim_secretaria_alias a
WHERE c.secretaria_id IS NULL
  AND c.secretaria IS NOT NULL
  AND a.secretaria_id IS NOT NULL
  AND a.texto_origem_norm = public.norm_txt(c.secretaria);
