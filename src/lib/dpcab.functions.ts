import { createServerFn } from "@tanstack/react-start";

export const getDashboardData = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [cp, ps, venc] = await Promise.all([
    supabaseAdmin.from("concurso_publico").select("*").order("cargo"),
    supabaseAdmin.from("processo_seletivo").select("*").order("cargo"),
    supabaseAdmin.from("vencimentos").select("*").order("dias_restantes"),
  ]);
  if (cp.error) throw new Error(cp.error.message);
  if (ps.error) throw new Error(ps.error.message);
  if (venc.error) throw new Error(venc.error.message);
  return {
    cp: cp.data ?? [],
    ps: ps.data ?? [],
    venc: venc.data ?? [],
  };
});