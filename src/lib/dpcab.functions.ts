import { createServerFn } from "@tanstack/react-start";
import { throwSafe } from "@/lib/server-errors";
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
  if (cp.error) throwSafe(cp.error);
  if (ps.error) throwSafe(ps.error);
  if (venc.error) throwSafe(venc.error);
  return {
    cp: cp.data ?? [],
    ps: ps.data ?? [],
    venc: venc.data ?? [],
  };
  });