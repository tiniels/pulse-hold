import { createServerFn } from "@tanstack/react-start";
import { throwSafe } from "@/lib/server-errors";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Cargo-first dashboard for /admissao.
 * Todas as métricas são projetadas a partir de dim_cargo (SSOT).
 * Registros sem cargo canônico aparecem no bucket `NAO_CLASSIFICADOS`.
 */

export const CARGO_UNKNOWN_ID = "__nao_classificados__";

export type CargoLinha = {
  cargo_id: string; // pode ser CARGO_UNKNOWN_ID
  nome: string;
  grupo_cargo_id: string | null;
  grupo_nome: string | null;
  vinculo_id: string | null;
  vinculo_nome: string | null;
  nivel: string | null;
  jornada: string | null;
  salario_base: number | null;
  ativo: boolean;
  entradas: number;
  saidas: number;
  saldo: number;
  taxa_saida_pct: number | null; // saidas / (entradas + max(0, saidas)) heurística
  ultima_admissao: string | null;
  ultima_rescisao: string | null;
  ultima_movimentacao: string | null;
  dias_medios_casa: number | null; // média em dias entre admissao e rescisao das saídas no período
  serie_mensal: Array<{ mes: string; entradas: number; saidas: number }>;
  quadro_autorizado: number | null;
  cobertura_pct: number | null; // (entradas do período) / autorizado — usada só quando autorizado > 0
  sem_movimento: boolean;
};

export type CargoDashboard = {
  fromISO: string | null;
  toISO: string | null;
  linhas: CargoLinha[];
  totalRegistrosPeriodo: number;
  totalCargos: number;
  totalNaoClassificados: number;
};

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

async function pageAll<T>(supabase: any, build: (from: number, to: number) => any): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await build(from, from + size - 1);
    if (error) throwSafe(error);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < size) break;
  }
  return out;
}

export const listCargosDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { fromISO: string | null; toISO: string | null }) => data)
  .handler(async ({ data, context }): Promise<CargoDashboard> => {
    const supabase = context.supabase as any;
    const { fromISO, toISO } = data;

    const [cargosRes, gruposRes, vinculosRes, quadroRes] = await Promise.all([
      supabase.from("dim_cargo").select("id,nome,grupo_cargo_id,vinculo_id,nivel,jornada,salario_base,ativo"),
      supabase.from("dim_grupo_cargo").select("id,nome"),
      supabase.from("dim_vinculo").select("id,nome"),
      supabase.from("dim_quadro_autorizado").select("cargo_id,quantidade_autorizada,vigencia_inicio,vigencia_fim"),
    ]);
    for (const r of [cargosRes, gruposRes, vinculosRes, quadroRes]) if (r.error) throwSafe(r.error);

    const grupoNome = new Map<string, string>((gruposRes.data ?? []).map((g: any) => [g.id, g.nome]));
    const vincNome = new Map<string, string>((vinculosRes.data ?? []).map((v: any) => [v.id, v.nome]));

    const quadroPorCargo = new Map<string, number>();
    const today = new Date().toISOString().slice(0, 10);
    for (const q of quadroRes.data ?? []) {
      if (q.vigencia_fim && q.vigencia_fim < today) continue;
      if (q.vigencia_inicio && q.vigencia_inicio > today) continue;
      quadroPorCargo.set(q.cargo_id, (quadroPorCargo.get(q.cargo_id) ?? 0) + (q.quantidade_autorizada ?? 0));
    }

    // Admissoes (todo período para "última admissão"), + admissoes no período
    const admRows = await pageAll<any>(supabase, (from, to) =>
      supabase.from("admissoes").select("id,cargo_id,data_efetiva").not("data_efetiva", "is", null).range(from, to),
    );
    const resRows = await pageAll<any>(supabase, (from, to) =>
      supabase.from("rescisoes").select("id,cargo_id,data_rescisao,data_admissao").not("data_rescisao", "is", null).range(from, to),
    );

    type Agg = {
      entradas: number;
      saidas: number;
      ultimaAdm: string | null;
      ultimaRes: string | null;
      diasSum: number;
      diasN: number;
      serie: Map<string, { entradas: number; saidas: number }>;
    };
    const mk = (): Agg => ({ entradas: 0, saidas: 0, ultimaAdm: null, ultimaRes: null, diasSum: 0, diasN: 0, serie: new Map() });
    const byCargo = new Map<string, Agg>();
    const ensure = (id: string | null | undefined): Agg => {
      const k = id ?? CARGO_UNKNOWN_ID;
      let a = byCargo.get(k);
      if (!a) { a = mk(); byCargo.set(k, a); }
      return a;
    };
    const bumpSerie = (a: Agg, mes: string, key: "entradas" | "saidas") => {
      let s = a.serie.get(mes);
      if (!s) { s = { entradas: 0, saidas: 0 }; a.serie.set(mes, s); }
      s[key]++;
    };
    const inRange = (iso: string | null | undefined) => {
      if (!iso) return false;
      if (fromISO && iso < fromISO) return false;
      if (toISO && iso > toISO) return false;
      return true;
    };

    for (const r of admRows) {
      const a = ensure(r.cargo_id);
      if (!a.ultimaAdm || (r.data_efetiva && r.data_efetiva > a.ultimaAdm)) a.ultimaAdm = r.data_efetiva;
      if (inRange(r.data_efetiva)) {
        a.entradas++;
        bumpSerie(a, monthKey(r.data_efetiva), "entradas");
      }
    }
    for (const r of resRows) {
      const a = ensure(r.cargo_id);
      if (!a.ultimaRes || (r.data_rescisao && r.data_rescisao > a.ultimaRes)) a.ultimaRes = r.data_rescisao;
      if (inRange(r.data_rescisao)) {
        a.saidas++;
        bumpSerie(a, monthKey(r.data_rescisao), "saidas");
        if (r.data_admissao && r.data_rescisao) {
          const d = (Date.parse(r.data_rescisao) - Date.parse(r.data_admissao)) / 86400000;
          if (Number.isFinite(d) && d >= 0) { a.diasSum += d; a.diasN++; }
        }
      }
    }

    const now = Date.now();
    const MS_12M = 365 * 86400 * 1000;

    const linhas: CargoLinha[] = [];
    // 1) cargos canônicos
    for (const c of cargosRes.data ?? []) {
      const a = byCargo.get(c.id) ?? mk();
      const ultima = pickLatest(a.ultimaAdm, a.ultimaRes);
      const quadro = quadroPorCargo.get(c.id) ?? null;
      linhas.push({
        cargo_id: c.id,
        nome: c.nome,
        grupo_cargo_id: c.grupo_cargo_id,
        grupo_nome: c.grupo_cargo_id ? grupoNome.get(c.grupo_cargo_id) ?? null : null,
        vinculo_id: c.vinculo_id,
        vinculo_nome: c.vinculo_id ? vincNome.get(c.vinculo_id) ?? null : null,
        nivel: c.nivel ?? null,
        jornada: c.jornada ?? null,
        salario_base: c.salario_base != null ? Number(c.salario_base) : null,
        ativo: !!c.ativo,
        entradas: a.entradas,
        saidas: a.saidas,
        saldo: a.entradas - a.saidas,
        taxa_saida_pct: (a.entradas + a.saidas) > 0 ? (a.saidas / (a.entradas + a.saidas)) * 100 : null,
        ultima_admissao: a.ultimaAdm,
        ultima_rescisao: a.ultimaRes,
        ultima_movimentacao: ultima,
        dias_medios_casa: a.diasN > 0 ? Math.round(a.diasSum / a.diasN) : null,
        serie_mensal: seriesToArray(a.serie),
        quadro_autorizado: quadro,
        cobertura_pct: quadro && quadro > 0 ? (a.entradas / quadro) * 100 : null,
        sem_movimento: !ultima || (now - Date.parse(ultima)) > MS_12M,
      });
    }
    // 2) bucket "Não classificados"
    const naoClass = byCargo.get(CARGO_UNKNOWN_ID);
    if (naoClass && (naoClass.entradas + naoClass.saidas) > 0) {
      const ultima = pickLatest(naoClass.ultimaAdm, naoClass.ultimaRes);
      linhas.push({
        cargo_id: CARGO_UNKNOWN_ID,
        nome: "Não classificados",
        grupo_cargo_id: null,
        grupo_nome: null,
        vinculo_id: null,
        vinculo_nome: null,
        nivel: null,
        jornada: null,
        salario_base: null,
        ativo: true,
        entradas: naoClass.entradas,
        saidas: naoClass.saidas,
        saldo: naoClass.entradas - naoClass.saidas,
        taxa_saida_pct: (naoClass.entradas + naoClass.saidas) > 0 ? (naoClass.saidas / (naoClass.entradas + naoClass.saidas)) * 100 : null,
        ultima_admissao: naoClass.ultimaAdm,
        ultima_rescisao: naoClass.ultimaRes,
        ultima_movimentacao: ultima,
        dias_medios_casa: naoClass.diasN > 0 ? Math.round(naoClass.diasSum / naoClass.diasN) : null,
        serie_mensal: seriesToArray(naoClass.serie),
        quadro_autorizado: null,
        cobertura_pct: null,
        sem_movimento: false,
      });
    }

    const totalMov = linhas.reduce((s, l) => s + l.entradas + l.saidas, 0);
    return {
      fromISO,
      toISO,
      linhas,
      totalRegistrosPeriodo: totalMov,
      totalCargos: linhas.length,
      totalNaoClassificados: naoClass ? naoClass.entradas + naoClass.saidas : 0,
    };
  });

function pickLatest(a: string | null, b: string | null): string | null {
  if (a && b) return a > b ? a : b;
  return a ?? b ?? null;
}
function seriesToArray(m: Map<string, { entradas: number; saidas: number }>) {
  return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([mes, v]) => ({ mes, ...v }));
}

/* ================== drill-down: cargo → secretaria → servidor ================== */

export type CargoDetalheSecretaria = {
  secretaria_id: string | null;
  secretaria_nome: string;
  entradas: number;
  saidas: number;
  saldo: number;
};

export type CargoDetalheServidor = {
  tipo: "admissao" | "rescisao";
  nome: string;
  matricula: string | null;
  data: string;
  secretaria_id: string | null;
  motivo_categoria: string | null;
};

export type CargoDetalhe = {
  cargo_id: string;
  cargo_nome: string;
  por_secretaria: CargoDetalheSecretaria[];
  servidores: CargoDetalheServidor[];
  serie_mensal: Array<{ mes: string; entradas: number; saidas: number; saldoAcum: number }>;
  certames: Array<{ id: string; tipo: string; numero: string | null; ano: number | null; situacao: string | null; qtd_aprovados: number; total_disponivel: number; vencimento: string | null }>;
};

export const getCargoDetalhe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cargo_id: string; fromISO: string | null; toISO: string | null }) => d)
  .handler(async ({ data, context }): Promise<CargoDetalhe> => {
    const supabase = context.supabase as any;
    const isUnknown = data.cargo_id === CARGO_UNKNOWN_ID;

    let cargoNome = "Não classificados";
    if (!isUnknown) {
      const { data: c, error } = await supabase.from("dim_cargo").select("nome").eq("id", data.cargo_id).maybeSingle();
      if (error) throwSafe(error);
      cargoNome = c?.nome ?? "—";
    }

    const [secDim, motDim] = await Promise.all([
      supabase.from("dim_secretaria").select("id,nome_oficial"),
      supabase.from("dim_motivo").select("id,nome"),
    ]);
    if (secDim.error) throwSafe(secDim.error);
    if (motDim.error) throwSafe(motDim.error);
    const secNome = new Map<string, string>((secDim.data ?? []).map((s: any) => [s.id, s.nome_oficial]));
    const motNome = new Map<string, string>((motDim.data ?? []).map((s: any) => [s.id, s.nome]));

    const admQ = supabase.from("admissoes").select("nome,prontuario,data_efetiva,secretaria_id").not("data_efetiva", "is", null);
    const resQ = supabase.from("rescisoes").select("nome,matricula,data_rescisao,secretaria_id,motivo_id").not("data_rescisao", "is", null);
    const adm = isUnknown ? admQ.is("cargo_id", null) : admQ.eq("cargo_id", data.cargo_id);
    const res = isUnknown ? resQ.is("cargo_id", null) : resQ.eq("cargo_id", data.cargo_id);
    if (data.fromISO) { adm.gte("data_efetiva", data.fromISO); res.gte("data_rescisao", data.fromISO); }
    if (data.toISO) { adm.lte("data_efetiva", data.toISO); res.lte("data_rescisao", data.toISO); }
    const [admRes, resRes] = await Promise.all([adm.order("data_efetiva", { ascending: false }), res.order("data_rescisao", { ascending: false })]);
    if (admRes.error) throwSafe(admRes.error);
    if (resRes.error) throwSafe(resRes.error);

    const bySec = new Map<string, CargoDetalheSecretaria>();
    const ensure = (sid: string | null) => {
      const k = sid ?? "__sem_sec__";
      let v = bySec.get(k);
      if (!v) { v = { secretaria_id: sid, secretaria_nome: sid ? secNome.get(sid) ?? "—" : "Sem secretaria", entradas: 0, saidas: 0, saldo: 0 }; bySec.set(k, v); }
      return v;
    };

    const servidores: CargoDetalheServidor[] = [];
    for (const a of admRes.data ?? []) {
      ensure(a.secretaria_id).entradas++;
      servidores.push({ tipo: "admissao", nome: a.nome, matricula: a.prontuario ?? null, data: a.data_efetiva, secretaria_id: a.secretaria_id ?? null, motivo_categoria: null });
    }
    for (const r of resRes.data ?? []) {
      ensure(r.secretaria_id).saidas++;
      servidores.push({ tipo: "rescisao", nome: r.nome, matricula: r.matricula ?? null, data: r.data_rescisao, secretaria_id: r.secretaria_id ?? null, motivo_categoria: r.motivo_id ? motNome.get(r.motivo_id) ?? null : null });
    }
    for (const v of bySec.values()) v.saldo = v.entradas - v.saidas;

    // série mensal com saldo acumulado
    const mes = new Map<string, { entradas: number; saidas: number }>();
    const bump = (iso: string, k: "entradas" | "saidas") => {
      const key = iso.slice(0, 7);
      let m = mes.get(key); if (!m) { m = { entradas: 0, saidas: 0 }; mes.set(key, m); }
      m[k]++;
    };
    for (const s of servidores) bump(s.data, s.tipo === "admissao" ? "entradas" : "saidas");
    const serie_mensal: CargoDetalhe["serie_mensal"] = [];
    let acc = 0;
    for (const [k, v] of Array.from(mes.entries()).sort(([a], [b]) => a.localeCompare(b))) {
      acc += v.entradas - v.saidas;
      serie_mensal.push({ mes: k, entradas: v.entradas, saidas: v.saidas, saldoAcum: acc });
    }

    // certames vinculados
    let certames: CargoDetalhe["certames"] = [];
    if (!isUnknown) {
      const { data: cs, error: cErr } = await supabase
        .from("lev_certames")
        .select("id,tipo,numero,ano,situacao,qtd_aprovados,total_disponivel,vencimento")
        .eq("cargo_id", data.cargo_id)
        .order("vencimento", { ascending: true, nullsFirst: false })
        .limit(50);
      if (cErr) throwSafe(cErr);
      certames = (cs ?? []) as CargoDetalhe["certames"];
    }

    return {
      cargo_id: data.cargo_id,
      cargo_nome: cargoNome,
      por_secretaria: Array.from(bySec.values()).sort((a, b) => (b.entradas + b.saidas) - (a.entradas + a.saidas)),
      servidores: servidores.sort((a, b) => b.data.localeCompare(a.data)),
      serie_mensal,
      certames,
    };
  });

/* ================== quadro autorizado CRUD ================== */

export type QuadroAutorizadoRow = {
  id: string;
  cargo_id: string;
  cargo_nome: string;
  secretaria_id: string | null;
  secretaria_nome: string | null;
  quantidade_autorizada: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  fonte: string | null;
  observacoes: string | null;
};

export const listQuadroAutorizado = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<QuadroAutorizadoRow[]> => {
    const supabase = context.supabase as any;
    const { data, error } = await supabase
      .from("dim_quadro_autorizado")
      .select("id,cargo_id,secretaria_id,quantidade_autorizada,vigencia_inicio,vigencia_fim,fonte,observacoes,dim_cargo(nome),dim_secretaria(nome_oficial)")
      .order("vigencia_inicio", { ascending: false });
    if (error) throwSafe(error);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      cargo_id: r.cargo_id,
      cargo_nome: r.dim_cargo?.nome ?? "—",
      secretaria_id: r.secretaria_id,
      secretaria_nome: r.dim_secretaria?.nome_oficial ?? null,
      quantidade_autorizada: r.quantidade_autorizada,
      vigencia_inicio: r.vigencia_inicio,
      vigencia_fim: r.vigencia_fim,
      fonte: r.fonte,
      observacoes: r.observacoes,
    }));
  });

export const upsertQuadroAutorizado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id?: string;
    cargo_id: string;
    secretaria_id: string | null;
    quantidade_autorizada: number;
    vigencia_inicio: string;
    vigencia_fim: string | null;
    fonte: string | null;
    observacoes: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { id, ...rest } = data;
    const { error } = id
      ? await supabase.from("dim_quadro_autorizado").update(rest).eq("id", id)
      : await supabase.from("dim_quadro_autorizado").insert(rest);
    if (error) throwSafe(error);
    return { ok: true };
  });

export const deleteQuadroAutorizado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { error } = await supabase.from("dim_quadro_autorizado").delete().eq("id", data.id);
    if (error) throwSafe(error);
    return { ok: true };
  });