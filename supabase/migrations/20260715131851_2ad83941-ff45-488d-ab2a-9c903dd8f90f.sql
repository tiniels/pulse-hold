
-- 1. Admin-only INSERT/UPDATE/DELETE policies on user_roles to prevent privilege escalation
DROP POLICY IF EXISTS "Admins manage roles insert" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles update" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles delete" ON public.user_roles;

CREATE POLICY "Admins manage roles insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Ensure only service_role has table-level INSERT/UPDATE/DELETE grants (RLS + role for admins via service_role calls if needed)
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;

-- 2. Lock down SECURITY DEFINER helper functions from being callable by authenticated users.
-- Keep has_role / is_staff callable because they are used inside RLS policies.
REVOKE ALL ON FUNCTION public._infer_secretaria_id(text) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION public._infer_grupo_cargo_id(text) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public._infer_secretaria_id(text) TO service_role;
GRANT EXECUTE ON FUNCTION public._infer_grupo_cargo_id(text) TO service_role;
