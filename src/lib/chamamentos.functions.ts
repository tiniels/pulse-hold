import { createServerFn } from "@tanstack/react-start";
import { throwSafe } from "@/lib/server-errors";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import salariosMap from "@/data/salarios.json";

function norm(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function salarioDe(cargo: string | null | undefined): number | null {
  if (!cargo) return null;
  const map = salariosMap as Record<string, number | null>;
  const k = norm(cargo).replace(/^CARGO\s*\d+\s*[-–]\s*/i, "").trim();
  if (k in map) return map[k];
  // partial: try startsWith
  for (const key of Object.keys(map)) {
    if (key.startsWith(k) || k.startsWith(key)) return map[key];
  }
  return null;
}

export const listChamamentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (i: {
      page?: number;
      pageSize?: number;
      q?: string | null;
      secretaria?: string | null;
      cargo?: string | null;
      motivo?: string | null;
      status?: string | null;
      tipo?: string | null;
      ano?: number | null;
      numero?: string | null;
    }) => i,
  )
  .handler(async ({ data, context }) => {
    const page = data.page ?? 0;
    const pageSize = data.pageSize ?? 50;
    let q = context.supabase
      .from("chamamentos")
      .select(
        "id,secretaria,memo_os,data_memo,motivo,cargo,cargo_normalizado,prazo_contrato,regularizar_concurso,data_publicacao,numero_concurso,tipo_concurso,classificacao,classificacao_num,cota,nome,responsavel,prontuario,data_inicio,observacao,status,ano_publicacao",
        { count: "exact" },
      );
    if (data.q) {
      const s = `%${data.q}%`;
      q = q.or(
        `nome.ilike.${s},prontuario.ilike.${s},memo_os.ilike.${s},responsavel.ilike.${s}`,
      );
    }
    if (data.secretaria) q = q.eq("secretaria", data.secretaria);
    if (data.cargo) q = q.ilike("cargo_normalizado", `%${norm(data.cargo)}%`);
    if (data.motivo) q = q.ilike("motivo", `%${data.motivo}%`);
    if (data.status) q = q.eq("status", data.status);
    if (data.tipo) q = q.eq("tipo_concurso", data.tipo);
    if (data.ano) q = q.eq("ano_publicacao", data.ano);
    if (data.numero) q = q.eq("numero_concurso", data.numero);
    q = q
      .order("data_publicacao", { ascending: false, nullsFirst: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    const { data: rows, error, count } = await q;
    if (error) throwSafe(error);
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const getChamamentosKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const status = async (s: string) => {
      const { count } = await supabase
        .from("chamamentos")
        .select("*", { count: "exact", head: true })
        .eq("status", s);
      return count ?? 0;
    };
    const [pendentes, concluidos, andamento, aguardando, desistencia, renuncia] =
      await Promise.all([
        status("PENDENTE"),
        status("INICIOU"),
        status("EM_ANDAMENTO"),
        status("AGUARDANDO_HOMOLOGACAO"),
        status("DESISTENCIA"),
        status("RENUNCIA"),
      ]);
    const { count: total } = await supabase
      .from("chamamentos")
      .select("*", { count: "exact", head: true });
    // certames vigentes
    const today = new Date().toISOString().slice(0, 10);
    const { count: cpVig } = await supabase
      .from("concursos")
      .select("*", { count: "exact", head: true })
      .eq("tipo", "CP")
      .or(`prorrogado_ate.gte.${today},data_vencimento.gte.${today}`);
    const { count: psVig } = await supabase
      .from("concursos")
      .select("*", { count: "exact", head: true })
      .eq("tipo", "PS")
      .or(`prorrogado_ate.gte.${today},data_vencimento.gte.${today}`);
    // tempo médio: data_publicacao -> data_inicio (posse)
    const { data: rowsTime } = await supabase
      .from("chamamentos")
      .select("data_publicacao,data_inicio")
      .not("data_publicacao", "is", null)
      .not("data_inicio", "is", null)
      .limit(5000);
    let mediaConv = 0;
    if (rowsTime && rowsTime.length) {
      let s = 0,
        n = 0;
      for (const r of rowsTime) {
        const a = new Date(r.data_publicacao as string).getTime();
        const b = new Date(r.data_inicio as string).getTime();
        const d = (b - a) / 86400000;
        if (d >= 0 && d < 400) {
          s += d;
          n++;
        }
      }
      mediaConv = n ? Math.round(s / n) : 0;
    }
    return {
      total: total ?? 0,
      pendentes,
      concluidos,
      andamento,
      aguardando,
      desistencia,
      renuncia,
      cpVigentes: cpVig ?? 0,
      psVigentes: psVig ?? 0,
      tempoMedioDias: mediaConv,
    };
  });

export const listSecretariasChamamento = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("chamamentos")
      .select("secretaria")
      .not("secretaria", "is", null);
    const set = new Set<string>();
    (data ?? []).forEach((r: { secretaria: string | null }) => {
      if (r.secretaria) set.add(r.secretaria);
    });
    return Array.from(set).sort();
  });

export const getCertameCargosDetalhe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { concursoId?: string; tipo?: string; numero?: string }) => i)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    let concurso: any = null;
    if (data.concursoId) {
      const { data: c } = await supabase
        .from("concursos")
        .select("*")
        .eq("id", data.concursoId)
        .maybeSingle();
      concurso = c;
    } else if (data.tipo && data.numero) {
      const { data: c } = await supabase
        .from("concursos")
        .select("*")
        .eq("tipo", data.tipo)
        .eq("numero", data.numero)
        .maybeSingle();
      concurso = c;
    }
    if (!concurso) return { concurso: null, cargos: [] };
    const { data: cargos } = await supabase
      .from("cargos_fila")
      .select("id,nome_original,nome_normalizado,secao")
      .eq("concurso_id", concurso.id)
      .order("nome_original");
    const cargoIds = (cargos ?? []).map((c: any) => c.id);
    let candStats: Record<string, { total: number; disponiveis: number; convocados: number; outros: number }> = {};
    if (cargoIds.length) {
      const { data: cands } = await supabase
        .from("candidatos")
        .select("cargo_fila_id,status")
        .in("cargo_fila_id", cargoIds);
      (cands ?? []).forEach((c: any) => {
        const s = (candStats[c.cargo_fila_id] ??= {
          total: 0,
          disponiveis: 0,
          convocados: 0,
          outros: 0,
        });
        s.total++;
        if (c.status === "DISPONIVEL") s.disponiveis++;
        else if (["CONVOCADO", "NOTIFICADO", "APROVADO"].includes(c.status)) s.convocados++;
        else s.outros++;
      });
    }
    const enriched = (cargos ?? []).map((c: any) => ({
      ...c,
      salario_ref: salarioDe(c.nome_original),
      stats: candStats[c.id] ?? { total: 0, disponiveis: 0, convocados: 0, outros: 0 },
    }));
    return { concurso, cargos: enriched };
  });

export const getFilaCargoDetalhe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { cargoFilaId: string }) => i)
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const { data: cargo } = await supabase
      .from("cargos_fila")
      .select("id,nome_original,nome_normalizado,secao,concurso:concursos(id,tipo,numero,data_realizacao,data_homologacao,data_vencimento,prorrogado_ate)")
      .eq("id", data.cargoFilaId)
      .maybeSingle();
    if (!cargo) return { cargo: null, candidatos: [] };
    const { data: cands } = await supabase
      .from("candidatos")
      .select("id,inscricao,nome,documento,nota,classificacao,lista_tipo,status,data_convocacao,observacao")
      .eq("cargo_fila_id", data.cargoFilaId)
      .order("classificacao", { ascending: true, nullsFirst: false });
    // cruza com prontuários e chamamentos por nome normalizado
    const nomes = (cands ?? [])
      .map((c: any) => norm(c.nome))
      .filter(Boolean);
    let prontMap = new Map<string, any>();
    let chamMap = new Map<string, any[]>();
    if (nomes.length) {
      const { data: pronts } = await supabase
        .from("prontuarios")
        .select("prontuario,nome_normalizado,secretaria,vinculo,ano_ingresso,cargo,memorando")
        .in("nome_normalizado", nomes);
      (pronts ?? []).forEach((p: any) => prontMap.set(p.nome_normalizado, p));
      const { data: chams } = await supabase
        .from("chamamentos")
        .select("nome,secretaria,motivo,status,data_publicacao,data_inicio,memo_os,responsavel")
        .in("nome", (cands ?? []).map((c: any) => c.nome).filter(Boolean));
      (chams ?? []).forEach((h: any) => {
        const k = norm(h.nome);
        if (!chamMap.has(k)) chamMap.set(k, []);
        chamMap.get(k)!.push(h);
      });
    }
    const salario = salarioDe(cargo.nome_original);
    const enriched = (cands ?? []).map((c: any) => {
      const k = norm(c.nome);
      const pront = prontMap.get(k);
      const historico = chamMap.get(k) ?? [];
      return {
        ...c,
        salario_ref: salario,
        prontuario: pront?.prontuario ?? null,
        prontuario_secretaria: pront?.secretaria ?? null,
        prontuario_vinculo: pront?.vinculo ?? null,
        ja_chamado: historico.length > 0,
        chamamentos: historico,
      };
    });
    return { cargo, candidatos: enriched };
  });

export const updateChamamentoStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; status: string; observacao?: string | null }) => i)
  .handler(async ({ data, context }) => {
    const patch: { status: string; observacao?: string | null } = {
      status: data.status,
    };
    if (data.observacao !== undefined) patch.observacao = data.observacao;
    const { error } = await context.supabase
      .from("chamamentos")
      .update(patch)
      .eq("id", data.id);
    if (error) throwSafe(error);
    return { ok: true };
  });