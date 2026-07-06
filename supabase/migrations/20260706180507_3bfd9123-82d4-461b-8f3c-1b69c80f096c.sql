
ALTER TABLE public.dim_grupo_cargo ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE public.dim_grupo_cargo ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.dim_vinculo ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE public.dim_vinculo ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.dim_vinculo ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.dim_motivo ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE public.dim_motivo ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.dim_motivo ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.dim_situacao_chamamento ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE public.dim_situacao_chamamento ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.dim_situacao_chamamento ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_dim_grupo_cargo_upd ON public.dim_grupo_cargo;
CREATE TRIGGER trg_dim_grupo_cargo_upd BEFORE UPDATE ON public.dim_grupo_cargo
FOR EACH ROW EXECUTE FUNCTION public.lev_touch_updated_at();

DROP TRIGGER IF EXISTS trg_dim_vinculo_upd ON public.dim_vinculo;
CREATE TRIGGER trg_dim_vinculo_upd BEFORE UPDATE ON public.dim_vinculo
FOR EACH ROW EXECUTE FUNCTION public.lev_touch_updated_at();

DROP TRIGGER IF EXISTS trg_dim_motivo_upd ON public.dim_motivo;
CREATE TRIGGER trg_dim_motivo_upd BEFORE UPDATE ON public.dim_motivo
FOR EACH ROW EXECUTE FUNCTION public.lev_touch_updated_at();

DROP TRIGGER IF EXISTS trg_dim_situacao_upd ON public.dim_situacao_chamamento;
CREATE TRIGGER trg_dim_situacao_upd BEFORE UPDATE ON public.dim_situacao_chamamento
FOR EACH ROW EXECUTE FUNCTION public.lev_touch_updated_at();
