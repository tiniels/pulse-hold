import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
  const [cp, ps, venc] = await Promise.all([
    supabase.from("concurso_publico").select("*").order("cargo"),
    supabase.from("processo_seletivo").select("*").order("cargo"),
    supabase.from("vencimentos").select("*").order("dias_restantes"),
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