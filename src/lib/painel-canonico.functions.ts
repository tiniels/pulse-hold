import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Painel Executivo — camada de dados 100% canônica.
 * NENHUM texto de origem das bases é exposto para a UI a partir daqui.
 * Todo relacionamento é feito por IDs canônicos (uuid).
 */

export type SaidaCategoria =
  | "Exoneração"
  | "Aposentadoria"
  | "Vacância"
  | "Falecimento"
  | "Rescisão"
  | "Demissão"
  | "Outros";

export type EntradaCanonica = {
  id: number;
  nome: string;
  matricula: string | null;
  data: string; // yyyy-mm-dd
  secretaria_id: string | null;
  grupo_cargo_id: string | null;
  cargo_id: string | null;
  especialidade_id: string | null;
  vinculo_id: string | null;
};

export type SaidaCanonica = EntradaCanonica & {
  motivo_id: string | null;
  saida_categoria: SaidaCategoria;
};

export type DimRef = { id: string; nome: string; parent_id?: string | null; sigla?: string | null };

export type PainelDims = {
  secretarias: DimRef[];
  unidades: DimRef[];
  grupos_cargo: DimRef[];
  cargos: DimRef[];
  especialidades: DimRef[];
  vinculos: DimRef[];
  motivos: (DimRef & { categoria: string | null })[];
};

function bucketMotivo(nome: string | null | undefined): SaidaCategoria {
  const n = (nome ?? "").toLowerCase();
  if (n.startsWith("aposent")) return "Aposentadoria";
  if (n.startsWith("exoner")) return "Exoneração";
  if (n.startsWith("vac")) return "Vacância";
  if (n.startsWith("falec")) return "Falecimento";
  if (n.startsWith("demiss")) return "Demissão";
  if (n.startsWith("rescis") || n.startsWith("término") || n.startsWith("termino")) return "Rescisão";
  return "Outros";
}

async function fetchAllPaged<T>(
  supabase: any,
  build: (from: number, to: number) => any,
): Promise<T[]> {
  const pageSize = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

export const listDimensoesCanonicas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PainelDims> => {
    const supabase = context.supabase as any;
    const [sec, uni, gc, car, esp, vin, mot] = await Promise.all([
      supabase.from("dim_secretaria").select("id,nome_oficial,sigla").order("nome_oficial"),
      supabase.from("dim_unidade").select("id,nome_oficial,secretaria_id"),
      supabase.from("dim_grupo_cargo").select("id,nome").order("nome"),
      supabase.from("dim_cargo").select("id,nome,grupo_cargo_id"),
      supabase.from("dim_especialidade").select("id,nome,grupo_cargo_id").order("nome"),
      supabase.from("dim_vinculo").select("id,nome").order("nome"),
      supabase.from("dim_motivo").select("id,nome,categoria").order("nome"),
    ]);
    for (const r of [sec, uni, gc, car, esp, vin, mot]) {
      if (r.error) throw new Error(r.error.message);
    }
    return {
      secretarias: (sec.data ?? []).map((r: any) => ({ id: r.id, nome: r.nome_oficial, sigla: r.sigla })),
      unidades: (uni.data ?? []).map((r: any) => ({ id: r.id, nome: r.nome_oficial, parent_id: r.secretaria_id })),
      grupos_cargo: (gc.data ?? []).map((r: any) => ({ id: r.id, nome: r.nome })),
      cargos: (car.data ?? []).map((r: any) => ({ id: r.id, nome: r.nome, parent_id: r.grupo_cargo_id })),
      especialidades: (esp.data ?? []).map((r: any) => ({ id: r.id, nome: r.nome, parent_id: r.grupo_cargo_id })),
      vinculos: (vin.data ?? []).map((r: any) => ({ id: r.id, nome: r.nome })),
      motivos: (mot.data ?? []).map((r: any) => ({ id: r.id, nome: r.nome, categoria: r.categoria })),
    };
  });

export const listMovimentacoesCanonicas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { fromISO: string | null; toISO: string | null }) => data)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { fromISO, toISO } = data;

    // Fetch motivos map first (small dim)
    const { data: motivos, error: mErr } = await supabase.from("dim_motivo").select("id,nome");
    if (mErr) throw new Error(mErr.message);
    const motivoById = new Map<string, string>();
    (motivos ?? []).forEach((m: any) => motivoById.set(m.id, m.nome));

    const admissoesRows = await fetchAllPaged<any>(supabase, (from, to) => {
      let q = supabase
        .from("admissoes")
        .select("id,nome,prontuario,data_efetiva,secretaria_id,grupo_cargo_id,cargo_id,especialidade_id,vinculo_id")
        .not("data_efetiva", "is", null)
        .order("data_efetiva", { ascending: true })
        .range(from, to);
      if (fromISO) q = q.gte("data_efetiva", fromISO);
      if (toISO) q = q.lte("data_efetiva", toISO);
      return q;
    });

    const rescisoesRows = await fetchAllPaged<any>(supabase, (from, to) => {
      let q = supabase
        .from("rescisoes")
        .select("id,nome,matricula,data_rescisao,secretaria_id,grupo_cargo_id,cargo_id,especialidade_id,vinculo_id,motivo_id")
        .order("data_rescisao", { ascending: false })
        .range(from, to);
      if (fromISO) q = q.gte("data_rescisao", fromISO);
      if (toISO) q = q.lte("data_rescisao", toISO);
      return q;
    });

    const entradas: EntradaCanonica[] = admissoesRows.map((a) => ({
      id: a.id,
      nome: a.nome,
      matricula: a.prontuario ?? null,
      data: a.data_efetiva,
      secretaria_id: a.secretaria_id ?? null,
      grupo_cargo_id: a.grupo_cargo_id ?? null,
      cargo_id: a.cargo_id ?? null,
      especialidade_id: a.especialidade_id ?? null,
      vinculo_id: a.vinculo_id ?? null,
    }));

    const saidas: SaidaCanonica[] = rescisoesRows.map((r) => ({
      id: r.id,
      nome: r.nome,
      matricula: r.matricula ?? null,
      data: r.data_rescisao,
      secretaria_id: r.secretaria_id ?? null,
      grupo_cargo_id: r.grupo_cargo_id ?? null,
      cargo_id: r.cargo_id ?? null,
      especialidade_id: r.especialidade_id ?? null,
      vinculo_id: r.vinculo_id ?? null,
      motivo_id: r.motivo_id ?? null,
      saida_categoria: bucketMotivo(r.motivo_id ? motivoById.get(r.motivo_id) : null),
    }));

    return { entradas, saidas };
  });

export type CoberturaTipo = {
  tipo: "secretaria" | "cargo" | "vinculo" | "motivo";
  label: string;
  total_registros: number;
  classificados: number;
  pendentes: number;
  pct: number;
  aliases_utilizados: number;
  aliases_pendentes: number;
};

export type CoberturaMDM = {
  totalRegistros: number;
  totalClassificados: number;
  totalPendentes: number;
  pctGlobal: number;
  porTipo: CoberturaTipo[];
};

export const listCoberturaMDM = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { fromISO: string | null; toISO: string | null }) => data)
  .handler(async ({ data, context }): Promise<CoberturaMDM> => {
    const supabase = context.supabase as any;
    const { fromISO, toISO } = data;

    // total + non-null counts on admissoes and rescisoes in period
    async function countCol(
      table: "admissoes" | "rescisoes",
      dateCol: string,
      col: string,
    ): Promise<{ total: number; notNull: number }> {
      let qTotal = supabase.from(table).select("id", { count: "exact", head: true });
      let qNotNull = supabase.from(table).select("id", { count: "exact", head: true }).not(col, "is", null);
      if (fromISO) { qTotal = qTotal.gte(dateCol, fromISO); qNotNull = qNotNull.gte(dateCol, fromISO); }
      if (toISO) { qTotal = qTotal.lte(dateCol, toISO); qNotNull = qNotNull.lte(dateCol, toISO); }
      const [t, n] = await Promise.all([qTotal, qNotNull]);
      if (t.error) throw new Error(t.error.message);
      if (n.error) throw new Error(n.error.message);
      return { total: t.count ?? 0, notNull: n.count ?? 0 };
    }

    async function aliasStats(aliasTable: string, fk: string) {
      const [rev, pend] = await Promise.all([
        supabase.from(aliasTable).select("id", { count: "exact", head: true }).eq("revisado", true).not(fk, "is", null),
        supabase.from(aliasTable).select("id", { count: "exact", head: true }).or(`${fk}.is.null,revisado.eq.false`),
      ]);
      if (rev.error) throw new Error(rev.error.message);
      if (pend.error) throw new Error(pend.error.message);
      return { utilizados: rev.count ?? 0, pendentes: pend.count ?? 0 };
    }

    // Secretaria (both tables)
    const [aSec, rSec, aCar, rCar, aVin, rVin, rMot] = await Promise.all([
      countCol("admissoes", "data_efetiva", "secretaria_id"),
      countCol("rescisoes", "data_rescisao", "secretaria_id"),
      countCol("admissoes", "data_efetiva", "cargo_id"),
      countCol("rescisoes", "data_rescisao", "cargo_id"),
      countCol("admissoes", "data_efetiva", "vinculo_id"),
      countCol("rescisoes", "data_rescisao", "vinculo_id"),
      countCol("rescisoes", "data_rescisao", "motivo_id"),
    ]);

    const [alSec, alCar, alVin, alMot] = await Promise.all([
      aliasStats("dim_secretaria_alias", "secretaria_id"),
      aliasStats("dim_cargo_alias", "grupo_cargo_id"),
      aliasStats("dim_vinculo_alias", "vinculo_id"),
      aliasStats("dim_motivo_alias", "motivo_id"),
    ]);

    function mk(
      tipo: CoberturaTipo["tipo"],
      label: string,
      totals: { total: number; notNull: number },
      al: { utilizados: number; pendentes: number },
    ): CoberturaTipo {
      const pct = totals.total ? (totals.notNull / totals.total) * 100 : 100;
      return {
        tipo,
        label,
        total_registros: totals.total,
        classificados: totals.notNull,
        pendentes: totals.total - totals.notNull,
        pct,
        aliases_utilizados: al.utilizados,
        aliases_pendentes: al.pendentes,
      };
    }

    const secT = { total: aSec.total + rSec.total, notNull: aSec.notNull + rSec.notNull };
    const carT = { total: aCar.total + rCar.total, notNull: aCar.notNull + rCar.notNull };
    const vinT = { total: aVin.total + rVin.total, notNull: aVin.notNull + rVin.notNull };

    const porTipo: CoberturaTipo[] = [
      mk("secretaria", "Secretarias", secT, alSec),
      mk("cargo", "Cargos", carT, alCar),
      mk("vinculo", "Vínculos", vinT, alVin),
      mk("motivo", "Motivos (saídas)", rMot, alMot),
    ];

    const totalRegistros = secT.total; // uso secretaria como denominador de "registros"
    const totalClassificados = secT.notNull;
    const totalPendentes = totalRegistros - totalClassificados;

    return {
      totalRegistros,
      totalClassificados,
      totalPendentes,
      pctGlobal: totalRegistros ? (totalClassificados / totalRegistros) * 100 : 100,
      porTipo,
    };
  });

export type AuditoriaAgregacao = {
  canonico_id: string;
  canonico_nome: string;
  aliases: Array<{ texto_origem_norm: string; texto_origem: string | null; revisado: boolean }>;
  total_classificados: number;
  total_pendentes_no_tipo: number;
};

export const listAuditoriaAgregacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { nivel: "secretaria" | "grupo_cargo" | "vinculo" | "motivo"; id: string }) => data,
  )
  .handler(async ({ data, context }): Promise<AuditoriaAgregacao> => {
    const supabase = context.supabase as any;
    const cfg = (() => {
      switch (data.nivel) {
        case "secretaria":
          return {
            dim: "dim_secretaria",
            dimNome: "nome_oficial",
            alias: "dim_secretaria_alias",
            fk: "secretaria_id",
            hasTextoOrigem: true,
            countTables: [
              { t: "admissoes", d: "data_efetiva" },
              { t: "rescisoes", d: "data_rescisao" },
            ],
          };
        case "grupo_cargo":
          return {
            dim: "dim_grupo_cargo",
            dimNome: "nome",
            alias: "dim_cargo_alias",
            fk: "grupo_cargo_id",
            hasTextoOrigem: false,
            countTables: [
              { t: "admissoes", d: "data_efetiva" },
              { t: "rescisoes", d: "data_rescisao" },
            ],
          };
        case "vinculo":
          return {
            dim: "dim_vinculo",
            dimNome: "nome",
            alias: "dim_vinculo_alias",
            fk: "vinculo_id",
            hasTextoOrigem: false,
            countTables: [
              { t: "admissoes", d: "data_efetiva" },
              { t: "rescisoes", d: "data_rescisao" },
            ],
          };
        case "motivo":
          return {
            dim: "dim_motivo",
            dimNome: "nome",
            alias: "dim_motivo_alias",
            fk: "motivo_id",
            hasTextoOrigem: false,
            countTables: [{ t: "rescisoes", d: "data_rescisao" }],
          };
      }
    })();

    const { data: dimRow, error: dErr } = await supabase
      .from(cfg.dim)
      .select(`id, ${cfg.dimNome}`)
      .eq("id", data.id)
      .single();
    if (dErr) throw new Error(dErr.message);

    const aliasCols = ["texto_origem_norm", "revisado", cfg.hasTextoOrigem ? "texto_origem" : null]
      .filter(Boolean)
      .join(",");
    const { data: aliases, error: aErr } = await supabase
      .from(cfg.alias)
      .select(aliasCols)
      .eq(cfg.fk, data.id)
      .order("texto_origem_norm");
    if (aErr) throw new Error(aErr.message);

    let classificados = 0;
    for (const c of cfg.countTables) {
      const { count, error } = await supabase
        .from(c.t)
        .select("id", { count: "exact", head: true })
        .eq(cfg.fk, data.id);
      if (error) throw new Error(error.message);
      classificados += count ?? 0;
    }

    let pendentes = 0;
    for (const c of cfg.countTables) {
      const { count, error } = await supabase
        .from(c.t)
        .select("id", { count: "exact", head: true })
        .is(cfg.fk, null);
      if (error) throw new Error(error.message);
      pendentes += count ?? 0;
    }

    return {
      canonico_id: dimRow.id,
      canonico_nome: (dimRow as any)[cfg.dimNome],
      aliases: (aliases ?? []).map((a: any) => ({
        texto_origem_norm: a.texto_origem_norm,
        texto_origem: a.texto_origem ?? null,
        revisado: !!a.revisado,
      })),
      total_classificados: classificados,
      total_pendentes_no_tipo: pendentes,
    };
  });