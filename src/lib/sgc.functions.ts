import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Chamamento = {
  id: string;
  secretaria: string;
  numero: string | null;
  memo_os: string | null;
  data_memo: string | null;
  motivo: string | null;
  cargo: string | null;
  cargo_normalizado: string | null;
  prazo_contrato: string | null;
  regularizar_concurso: string | null;
  data_publicacao: string | null;
  numero_concurso: string | null;
  tipo_concurso: string | null;
  classificacao: string | null;
  classificacao_num: number | null;
  cota: string | null;
  nome: string | null;
  responsavel: string | null;
  prontuario: string | null;
  data_inicio: string | null;
  observacao: string | null;
  status: string;
  ano_publicacao: number | null;
};

export type AndamentoRow = {
  id: string;
  secretaria: string;
  quantidade: number | null;
  cargo: string | null;
  cargo_normalizado: string | null;
  andamento: string | null;
  fase_kanban: number | null;
};

export const listChamamentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
    const pageSize = 1000;
    const all: Chamamento[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("chamamentos")
        .select("*")
        .order("data_publicacao", { ascending: false, nullsFirst: false })
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Chamamento[];
      all.push(...rows);
      if (rows.length < pageSize) break;
    }
    return all;
  });

export const listAndamento = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chamamentos_andamento_2026")
      .select("*")
      .order("secretaria");
    if (error) throw new Error(error.message);
    return (data ?? []) as AndamentoRow[];
  });

export const updateChamamentoStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      status:
        | "EM_ANDAMENTO"
        | "ATENCAO"
        | "INICIOU"
        | "AGUARDANDO_HOMOLOGACAO"
        | "RENUNCIA"
        | "DESISTENCIA";
      observacao?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const update: Record<string, unknown> = { status: data.status };
    if (data.observacao !== undefined) update.observacao = data.observacao;
    const { error } = await context.supabase
      .from("chamamentos")
      .update(update)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });