import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AuditInput = {
  acao: string;
  entidade: string;
  filtros?: Record<string, unknown> | null;
  detalhes?: Record<string, unknown> | null;
};

/**
 * Records a sensitive query or export in `audit_log`.
 * Silently swallows errors so the user action never fails because of logging.
 */
export const logAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: AuditInput) => i)
  .handler(async ({ data, context }) => {
    try {
      await context.supabase.from("audit_log").insert({
        user_id: context.userId,
        user_email: (context.claims as any)?.email ?? null,
        acao: data.acao,
        entidade: data.entidade,
        filtros: data.filtros ?? null,
        detalhes: data.detalhes ?? null,
      });
    } catch {
      /* best-effort logging */
    }
    return { ok: true };
  });