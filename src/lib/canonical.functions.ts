import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CanonicalDim = { id: string; nome: string };
export type GrupoKPI = {
  grupo_id: string;
  grupo_nome: string;
  admissoes: number;
  rescisoes: number;
  chamamentos: number;
  saldo: number;
};
export type SecretariaKPI = {
  secretaria_id: string;
  secretaria_nome: string;
  admissoes: number;
  rescisoes: number;
  chamamentos: number;
};
export type AliasPendente = {
  id: string;
  texto_origem_norm: string;
  texto_origem: string | null;
  canonico_id: string | null;
  canonico_nome: string | null;
  revisado: boolean;
  confianca: number | null;
  tipo: AliasTipo;
};

export type AliasTipo = "cargo" | "secretaria" | "vinculo" | "motivo" | "situacao";

export const listGruposKPI = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const { data, error } = await supabase
      .from("vw_kpi_por_grupo")
      .select("*")
      .order("admissoes", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as GrupoKPI[];
  });

export const listSecretariasKPI = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const { data, error } = await supabase
      .from("vw_kpi_por_secretaria")
      .select("*")
      .order("admissoes", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as SecretariaKPI[];
  });

const TIPO_TABLE: Record<AliasTipo, { alias: string; dim: string; fk: string; dimNome: string }> = {
  cargo: { alias: "dim_cargo_alias", dim: "dim_grupo_cargo", fk: "grupo_cargo_id", dimNome: "nome" },
  secretaria: { alias: "dim_secretaria_alias", dim: "dim_secretaria", fk: "secretaria_id", dimNome: "nome_oficial" },
  vinculo: { alias: "dim_vinculo_alias", dim: "dim_vinculo", fk: "vinculo_id", dimNome: "nome" },
  motivo: { alias: "dim_motivo_alias", dim: "dim_motivo", fk: "motivo_id", dimNome: "nome" },
  situacao: { alias: "dim_situacao_alias", dim: "dim_situacao_chamamento", fk: "situacao_id", dimNome: "nome" },
};

export const listAliases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tipo: AliasTipo; apenasPendentes?: boolean }) => data)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const cfg = TIPO_TABLE[data.tipo];
    const selectCols = data.tipo === "cargo"
      ? `id, texto_origem_norm, texto_origem, ${cfg.fk}, revisado, confianca`
      : `id, texto_origem_norm, texto_origem, ${cfg.fk}, revisado`;
    let query = supabase.from(cfg.alias).select(selectCols).order("texto_origem_norm");
    if (data.apenasPendentes) query = query.eq("revisado", false);
    const { data: rows, error } = await query.limit(2000);
    if (error) throw new Error(error.message);

    // fetch dim labels
    const { data: dims, error: derr } = await supabase.from(cfg.dim).select(`id, ${cfg.dimNome}`);
    if (derr) throw new Error(derr.message);
    const map = new Map<string, string>();
    (dims ?? []).forEach((d: any) => map.set(d.id, d[cfg.dimNome]));

    return (rows ?? []).map((r: any): AliasPendente => ({
      id: r.id,
      texto_origem_norm: r.texto_origem_norm,
      texto_origem: r.texto_origem ?? null,
      canonico_id: r[cfg.fk] ?? null,
      canonico_nome: r[cfg.fk] ? map.get(r[cfg.fk]) ?? null : null,
      revisado: !!r.revisado,
      confianca: r.confianca ?? null,
      tipo: data.tipo,
    }));
  });

export const listDim = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tipo: AliasTipo }) => data)
  .handler(async ({ data, context }) => {
    const cfg = TIPO_TABLE[data.tipo];
    const supabase = context.supabase as any;
    const { data: rows, error } = await supabase
      .from(cfg.dim)
      .select(`id, ${cfg.dimNome}`)
      .order(cfg.dimNome);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any): CanonicalDim => ({ id: r.id, nome: r[cfg.dimNome] }));
  });

export const resolverAlias = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tipo: AliasTipo; aliasId: string; canonicoId: string }) => data)
  .handler(async ({ data, context }) => {
    const cfg = TIPO_TABLE[data.tipo];
    const supabase = context.supabase as any;
    const patch: Record<string, unknown> = { [cfg.fk]: data.canonicoId, revisado: true };
    if (data.tipo === "cargo") patch.confianca = 100;
    const { error } = await supabase.from(cfg.alias).update(patch).eq("id", data.aliasId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });