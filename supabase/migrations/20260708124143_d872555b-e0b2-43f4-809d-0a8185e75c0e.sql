DROP TABLE IF EXISTS public.dim_cargo CASCADE;

CREATE TABLE public.dim_cargo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  vinculo_id uuid NOT NULL REFERENCES public.dim_vinculo(id) ON DELETE RESTRICT,
  grupo_cargo_id uuid REFERENCES public.dim_grupo_cargo(id) ON DELETE SET NULL,
  salario_base numeric(12,2),
  salario_real_esperado numeric(12,2),
  jornada text,
  nivel text,
  requisitos text[] NOT NULL DEFAULT '{}',
  beneficios text[] NOT NULL DEFAULT '{}',
  adicionais text[] NOT NULL DEFAULT '{}',
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nome, vinculo_id)
);

CREATE INDEX dim_cargo_grupo_idx ON public.dim_cargo(grupo_cargo_id);
CREATE INDEX dim_cargo_vinculo_idx ON public.dim_cargo(vinculo_id);
CREATE INDEX dim_cargo_nome_idx ON public.dim_cargo(lower(nome));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dim_cargo TO authenticated;
GRANT ALL ON public.dim_cargo TO service_role;

ALTER TABLE public.dim_cargo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dim_cargo select authenticated" ON public.dim_cargo FOR SELECT TO authenticated USING (true);
CREATE POLICY "dim_cargo insert authenticated" ON public.dim_cargo FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dim_cargo update authenticated" ON public.dim_cargo FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "dim_cargo delete authenticated" ON public.dim_cargo FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.tg_dim_cargo_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER dim_cargo_touch BEFORE UPDATE ON public.dim_cargo
  FOR EACH ROW EXECUTE FUNCTION public.tg_dim_cargo_touch();

ALTER TABLE public.dim_cargo_alias
  ADD COLUMN IF NOT EXISTS cargo_id uuid REFERENCES public.dim_cargo(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS dim_cargo_alias_cargo_idx ON public.dim_cargo_alias(cargo_id);