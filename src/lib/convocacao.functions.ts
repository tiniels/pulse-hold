import { createServerFn } from "@tanstack/react-start";
import { throwSafe } from "@/lib/server-errors";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^CARGO\s*\d+\s*[-–]\s*/i, "")
    .trim()
    .toUpperCase();
}

export const obterFila = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cargoNome: string; lista?: "GERAL" | "PCD" | "MSVD" | "TODAS" }) => input)
  .handler(async ({ data, context }) => {
    const supabaseAdmin = context.supabase;
    const norm = normalize(data.cargoNome);
    // Fetch cargos with this normalized name
    const { data: cargos, error: cgErr } = await supabaseAdmin
      .from("cargos_fila")
      .select("id, nome_original, secao, concurso:concursos(id, tipo, numero, data_realizacao, data_homologacao, prorrogado_ate, sheet_origem)")
      .eq("nome_normalizado", norm);
    if (cgErr) throwSafe(cgErr);
    if (!cargos || cargos.length === 0) {
      return { fila: [], convocados: [], outros: [], cargoNome: data.cargoNome };
    }
    const cargoIds = cargos.map((c) => c.id);
    const cargoMap = new Map(cargos.map((c) => [c.id, c]));

    let q = supabaseAdmin
      .from("candidatos")
      .select("*")
      .in("cargo_fila_id", cargoIds);
    if (data.lista && data.lista !== "TODAS") q = q.eq("lista_tipo", data.lista);
    const { data: cands, error: cdErr } = await q;
    if (cdErr) throwSafe(cdErr);

    const enriched = (cands ?? []).map((c) => {
      const cg: any = cargoMap.get(c.cargo_fila_id);
      return {
        ...c,
        concurso_tipo: cg?.concurso?.tipo as string,
        concurso_numero: cg?.concurso?.numero as string,
        concurso_data_realizacao: cg?.concurso?.data_realizacao as string | null,
        concurso_sheet: cg?.concurso?.sheet_origem as string,
        secao: cg?.secao as string,
      };
    });

    const listaOrder: Record<string, number> = { GERAL: 0, PCD: 1, MSVD: 2 };
    const sortFn = (a: any, b: any) => {
      const da = a.concurso_data_realizacao ?? "9999-12-31";
      const db = b.concurso_data_realizacao ?? "9999-12-31";
      if (da !== db) return da < db ? -1 : 1;
      const la = listaOrder[a.lista_tipo] ?? 9;
      const lb = listaOrder[b.lista_tipo] ?? 9;
      if (la !== lb) return la - lb;
      return (a.classificacao ?? 9999) - (b.classificacao ?? 9999);
    };

    const fila = enriched.filter((c) => c.status === "DISPONIVEL").sort(sortFn);
    const convocados = enriched
      .filter((c) => c.status === "CONVOCADO" || c.status === "NOTIFICADO" || c.status === "APROVADO")
      .sort(sortFn);
    const outros = enriched
      .filter((c) => !["DISPONIVEL", "CONVOCADO", "NOTIFICADO", "APROVADO"].includes(c.status))
      .sort(sortFn);

    return {
      cargoNome: data.cargoNome,
      fila,
      convocados,
      outros,
      stats: {
        total: enriched.length,
        disponiveis: fila.length,
        convocados: convocados.length,
        outros: outros.length,
      },
    };
  });

export const convocarCandidato = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { candidatoId: string; observacao?: string }) => input)
  .handler(async ({ data, context }) => {
    const supabaseAdmin = context.supabase;
    const { data: prev, error: pErr } = await supabaseAdmin
      .from("candidatos")
      .select("id, status")
      .eq("id", data.candidatoId)
      .maybeSingle();
    if (pErr) throwSafe(pErr);
    if (!prev) throw new Error("Candidato não encontrado");
    const { error: uErr } = await supabaseAdmin
      .from("candidatos")
      .update({ status: "CONVOCADO", data_convocacao: new Date().toISOString().slice(0, 10) })
      .eq("id", data.candidatoId);
    if (uErr) throwSafe(uErr);
    await supabaseAdmin.from("convocacoes_log").insert({
      candidato_id: data.candidatoId,
      acao: "CONVOCAR",
      status_anterior: prev.status,
      status_novo: "CONVOCADO",
      observacao: data.observacao ?? null,
    });
    return { ok: true };
  });

export const atualizarStatusCandidato = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      candidatoId: string;
      novoStatus: "DISPONIVEL" | "CONVOCADO" | "NOTIFICADO" | "APROVADO" | "REPROVADO" | "DESISTENTE" | "SEM_EFEITO";
      observacao?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const supabaseAdmin = context.supabase;
    const { data: prev } = await supabaseAdmin
      .from("candidatos")
      .select("id, status")
      .eq("id", data.candidatoId)
      .maybeSingle();
    if (!prev) throw new Error("Candidato não encontrado");
    const { error } = await supabaseAdmin
      .from("candidatos")
      .update({ status: data.novoStatus })
      .eq("id", data.candidatoId);
    if (error) throwSafe(error);
    await supabaseAdmin.from("convocacoes_log").insert({
      candidato_id: data.candidatoId,
      acao: "STATUS",
      status_anterior: prev.status,
      status_novo: data.novoStatus,
      observacao: data.observacao ?? null,
    });
    return { ok: true };
  });