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

export type DimField = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean";
  required?: boolean;
  isName?: boolean;
};

export type DimSchema = {
  tipo: AliasTipo;
  label: string;
  table: string;
  aliasTable: string;
  aliasFk: string;
  nameField: string;
  extraFields: DimField[];
  hasAtivo: boolean;
  hasTimestamps: boolean;
};

export const DIM_SCHEMAS: Record<AliasTipo, DimSchema> = {
  cargo: {
    tipo: "cargo",
    label: "Grupo de Cargo",
    table: "dim_grupo_cargo",
    aliasTable: "dim_cargo_alias",
    aliasFk: "grupo_cargo_id",
    nameField: "nome",
    extraFields: [{ key: "familia_funcional", label: "Família funcional", type: "text" }],
    hasAtivo: true,
    hasTimestamps: true,
  },
  secretaria: {
    tipo: "secretaria",
    label: "Secretaria",
    table: "dim_secretaria",
    aliasTable: "dim_secretaria_alias",
    aliasFk: "secretaria_id",
    nameField: "nome_oficial",
    extraFields: [{ key: "sigla", label: "Sigla", type: "text" }],
    hasAtivo: true,
    hasTimestamps: true,
  },
  vinculo: {
    tipo: "vinculo",
    label: "Vínculo",
    table: "dim_vinculo",
    aliasTable: "dim_vinculo_alias",
    aliasFk: "vinculo_id",
    nameField: "nome",
    extraFields: [],
    hasAtivo: true,
    hasTimestamps: true,
  },
  motivo: {
    tipo: "motivo",
    label: "Motivo",
    table: "dim_motivo",
    aliasTable: "dim_motivo_alias",
    aliasFk: "motivo_id",
    nameField: "nome",
    extraFields: [{ key: "categoria", label: "Categoria", type: "text" }],
    hasAtivo: true,
    hasTimestamps: true,
  },
  situacao: {
    tipo: "situacao",
    label: "Situação de Chamamento",
    table: "dim_situacao_chamamento",
    aliasTable: "dim_situacao_alias",
    aliasFk: "situacao_id",
    nameField: "nome",
    extraFields: [{ key: "ordem", label: "Ordem", type: "number", required: true }],
    hasAtivo: true,
    hasTimestamps: true,
  },
};

export type DimensaoRow = {
  id: string;
  nome: string;
  ativo: boolean;
  extras: Record<string, unknown>;
  aliases_count: number;
  created_at?: string | null;
  updated_at?: string | null;
};

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
    const hasTextoOrigem = data.tipo === "secretaria";
    const hasConfianca = data.tipo === "cargo";
    const selectCols = [
      "id",
      "texto_origem_norm",
      hasTextoOrigem ? "texto_origem" : null,
      cfg.fk,
      "revisado",
      hasConfianca ? "confianca" : null,
    ]
      .filter(Boolean)
      .join(", ");
    let query = supabase.from(cfg.alias).select(selectCols).order("texto_origem_norm");
    if (data.apenasPendentes) query = query.eq("revisado", false);
    const { data: rows, error } = await query.limit(2000);
    if (error) throw new Error(error.message);

    // fetch dim labels
    const { data: dims, error: derr } = await supabase.from(cfg.dim).select(`id, ${cfg.dimNome}`);
    if (derr) throw new Error(derr.message);
    const map = new Map<string, string>();
    (dims ?? []).forEach((d: any) => map.set(d.id, d[cfg.dimNome]));

    return (rows ?? []).map(
      (r: any): AliasPendente => ({
        id: r.id,
        texto_origem_norm: r.texto_origem_norm,
        texto_origem: r.texto_origem ?? null,
        canonico_id: r[cfg.fk] ?? null,
        canonico_nome: r[cfg.fk] ? (map.get(r[cfg.fk]) ?? null) : null,
        revisado: !!r.revisado,
        confianca: r.confianca ?? null,
        tipo: data.tipo,
      }),
    );
  });

export const listDim = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tipo: AliasTipo }) => data)
  .handler(async ({ data, context }) => {
    const cfg = TIPO_TABLE[data.tipo];
    const supabase = context.supabase as any;
    const { data: rows, error } = await supabase.from(cfg.dim).select(`id, ${cfg.dimNome}`).order(cfg.dimNome);
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

// ============================================================
// CRUD completo de dimensões canônicas
// ============================================================

export const listDimensoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tipo: AliasTipo }) => data)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const s = DIM_SCHEMAS[data.tipo];
    const cols = ["id", s.nameField, ...s.extraFields.map((f) => f.key)];
    if (s.hasAtivo) cols.push("ativo");
    if (s.hasTimestamps) cols.push("created_at", "updated_at");
    const { data: rows, error } = await supabase
      .from(s.table)
      .select(cols.join(", "))
      .order(s.nameField);
    if (error) throw new Error(error.message);

    const { data: aliases, error: aerr } = await supabase
      .from(s.aliasTable)
      .select(s.aliasFk)
      .not(s.aliasFk, "is", null);
    if (aerr) throw new Error(aerr.message);
    const counts = new Map<string, number>();
    (aliases ?? []).forEach((a: any) => {
      const k = a[s.aliasFk];
      counts.set(k, (counts.get(k) ?? 0) + 1);
    });

    return (rows ?? []).map((r: any): DimensaoRow => {
      const extras: Record<string, unknown> = {};
      s.extraFields.forEach((f) => (extras[f.key] = r[f.key]));
      return {
        id: r.id,
        nome: r[s.nameField],
        ativo: s.hasAtivo ? !!r.ativo : true,
        extras,
        aliases_count: counts.get(r.id) ?? 0,
        created_at: r.created_at ?? null,
        updated_at: r.updated_at ?? null,
      };
    });
  });

export const createDimensao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { tipo: AliasTipo; nome: string; extras?: Record<string, unknown>; ativo?: boolean }) => data,
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const s = DIM_SCHEMAS[data.tipo];
    const payload: Record<string, unknown> = { [s.nameField]: data.nome.trim() };
    if (s.hasAtivo) payload.ativo = data.ativo ?? true;
    for (const f of s.extraFields) {
      const v = data.extras?.[f.key];
      if (v !== undefined && v !== "" && v !== null) {
        payload[f.key] = f.type === "number" ? Number(v) : v;
      }
    }
    const { data: row, error } = await supabase.from(s.table).insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateDimensao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      tipo: AliasTipo;
      id: string;
      nome?: string;
      extras?: Record<string, unknown>;
      ativo?: boolean;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const s = DIM_SCHEMAS[data.tipo];
    const payload: Record<string, unknown> = {};
    if (data.nome !== undefined) payload[s.nameField] = data.nome.trim();
    if (data.ativo !== undefined && s.hasAtivo) payload.ativo = data.ativo;
    if (data.extras) {
      for (const f of s.extraFields) {
        if (f.key in data.extras) {
          const v = data.extras[f.key];
          payload[f.key] = v === "" || v === null || v === undefined
            ? null
            : f.type === "number" ? Number(v) : v;
        }
      }
    }
    const { error } = await supabase.from(s.table).update(payload).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDimensao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tipo: AliasTipo; id: string }) => data)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const s = DIM_SCHEMAS[data.tipo];
    const { error } = await supabase.from(s.table).delete().eq("id", data.id);
    if (error) {
      throw new Error(
        error.message.includes("violates foreign key")
          ? "Existem registros vinculados a esta dimensão. Desative-a ou remova primeiro os vínculos."
          : error.message,
      );
    }
    return { ok: true };
  });

export const duplicateDimensao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tipo: AliasTipo; id: string }) => data)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const s = DIM_SCHEMAS[data.tipo];
    const cols = [s.nameField, ...s.extraFields.map((f) => f.key)];
    if (s.hasAtivo) cols.push("ativo");
    const { data: orig, error } = await supabase.from(s.table).select(cols.join(", ")).eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const payload: Record<string, unknown> = { ...orig };
    payload[s.nameField] = `${orig[s.nameField]} (cópia)`;
    const { data: row, error: ierr } = await supabase.from(s.table).insert(payload).select("id").single();
    if (ierr) throw new Error(ierr.message);
    return { id: row.id };
  });

export const listAliasesForDim = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { tipo: AliasTipo; id: string }) => data)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const s = DIM_SCHEMAS[data.tipo];
    const hasTextoOrigem = data.tipo === "secretaria";
    const cols = ["id", "texto_origem_norm", "revisado", hasTextoOrigem ? "texto_origem" : null]
      .filter(Boolean)
      .join(", ");
    const { data: rows, error } = await supabase
      .from(s.aliasTable)
      .select(cols)
      .eq(s.aliasFk, data.id)
      .order("texto_origem_norm");
    if (error) throw new Error(error.message);
    return (rows ?? []) as Array<{
      id: string;
      texto_origem_norm: string;
      texto_origem?: string | null;
      revisado: boolean;
    }>;
  });
