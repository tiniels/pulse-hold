import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ServidorEvento = {
  tipo: "admissao" | "rescisao" | "evolucao" | "chamamento";
  data: string | null;
  descricao: string;
  cargo: string | null;
  vinculo: string | null;
  secretaria: string | null;
  motivo?: string | null;
};

export type ServidorFicha = {
  encontrado: boolean;
  prontuario: string | null;
  nome: string | null;
  cargo: string | null;
  vinculo: string | null;
  secretaria: string | null;
  telefone: string | null;
  observacao: string | null;
  ano_ingresso: number | null;
  data_inicio: string | null;
  eventos: ServidorEvento[];
};

function norm(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export const getServidorFicha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { prontuario?: string | null; nome?: string | null }) => data)
  .handler(async ({ data, context }): Promise<ServidorFicha> => {
    const supabase = context.supabase as any;
    const pront = (data.prontuario ?? "").toString().trim();
    const nomeNorm = norm(data.nome);

    let profile: any = null;
    if (pront) {
      const r = await supabase.from("prontuarios").select("*").eq("prontuario", pront).maybeSingle();
      profile = r.data;
    }
    if (!profile && nomeNorm) {
      const r = await supabase
        .from("prontuarios")
        .select("*")
        .eq("nome_normalizado", nomeNorm)
        .limit(1);
      profile = (r.data ?? [])[0] ?? null;
    }

    const eventos: ServidorEvento[] = [];

    // Admissoes
    const admQ = supabase
      .from("admissoes")
      .select("data_efetiva,cargo,vinculo,secretaria,nome,prontuario")
      .order("data_efetiva", { ascending: false })
      .limit(50);
    if (pront) admQ.eq("prontuario", pront);
    else if (nomeNorm) admQ.ilike("nome", `%${data.nome ?? ""}%`);
    const adm = await admQ;
    for (const a of adm.data ?? []) {
      eventos.push({
        tipo: "admissao",
        data: a.data_efetiva,
        descricao: "Admissão",
        cargo: a.cargo ?? null,
        vinculo: a.vinculo ?? null,
        secretaria: a.secretaria ?? null,
      });
    }

    // Rescisoes
    const resQ = supabase
      .from("rescisoes")
      .select("data_rescisao,cargo_nome,vinculo_nome,secretaria_nome,motivo_categoria,nome,matricula")
      .order("data_rescisao", { ascending: false })
      .limit(50);
    if (pront) resQ.eq("matricula", pront);
    else if (nomeNorm) resQ.ilike("nome", `%${data.nome ?? ""}%`);
    const res = await resQ;
    for (const r of res.data ?? []) {
      eventos.push({
        tipo: "rescisao",
        data: r.data_rescisao,
        descricao: "Rescisão",
        cargo: r.cargo_nome ?? null,
        vinculo: r.vinculo_nome ?? null,
        secretaria: r.secretaria_nome ?? null,
        motivo: r.motivo_categoria ?? null,
      });
    }

    // Evolucoes
    const evoQ = supabase
      .from("evolucoes_funcionais")
      .select("evolucao_data,evolucao_cargo_nome,evolucao_fundamento,cargo_atual_nome,vinculo_nome,secretaria_nome,nome,matricula")
      .order("evolucao_data", { ascending: false })
      .limit(50);
    if (pront) evoQ.eq("matricula", pront);
    else if (nomeNorm) evoQ.ilike("nome", `%${data.nome ?? ""}%`);
    const evo = await evoQ;
    for (const e of evo.data ?? []) {
      eventos.push({
        tipo: "evolucao",
        data: e.evolucao_data,
        descricao: e.evolucao_fundamento ?? "Evolução funcional",
        cargo: e.evolucao_cargo_nome ?? e.cargo_atual_nome ?? null,
        vinculo: e.vinculo_nome ?? null,
        secretaria: e.secretaria_nome ?? null,
      });
    }

    eventos.sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));

    return {
      encontrado: !!profile || eventos.length > 0,
      prontuario: profile?.prontuario ?? pront ?? null,
      nome: profile?.nome ?? data.nome ?? null,
      cargo: profile?.cargo ?? null,
      vinculo: profile?.vinculo ?? null,
      secretaria: profile?.secretaria ?? null,
      telefone: profile?.telefone ?? null,
      observacao: profile?.observacao ?? null,
      ano_ingresso: profile?.ano_ingresso ?? null,
      data_inicio: profile?.data_inicio ?? null,
      eventos,
    };
  });