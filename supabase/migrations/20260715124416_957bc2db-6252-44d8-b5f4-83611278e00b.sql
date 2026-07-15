-- 1. Role infrastructure
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','staff')
  );
$$;

-- Bootstrap: grant admin to the earliest existing auth user (likely the owner)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
ORDER BY created_at ASC LIMIT 1
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Helper to reset policies on a table to staff-only
CREATE OR REPLACE FUNCTION public._lockdown_staff(_table text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=_table LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, _table);
  END LOOP;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', _table);
  EXECUTE format($f$CREATE POLICY "Staff full access" ON public.%I FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))$f$, _table);
END $$;

-- 3. Apply lockdown to all sensitive & reference tables
SELECT public._lockdown_staff(t) FROM (VALUES
  ('admissoes'),('candidatos'),('chamamentos'),('convocacoes_log'),
  ('evolucoes_funcionais'),('prontuarios'),('rescisoes'),
  ('dim_cargo'),('dim_cargo_alias'),('dim_especialidade'),('dim_grupo_cargo'),
  ('dim_jornada'),('dim_motivo'),('dim_motivo_alias'),('dim_secretaria'),
  ('dim_secretaria_alias'),('dim_situacao_alias'),('dim_situacao_chamamento'),
  ('dim_submotivo'),('dim_unidade'),('dim_vinculo'),('dim_vinculo_alias'),
  ('lev_auditoria'),('lev_certames'),('lev_certames_historico'),
  ('lev_importacoes'),('lev_simulacoes')
) AS x(t);

DROP FUNCTION public._lockdown_staff(text);