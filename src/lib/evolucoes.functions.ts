import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Evolucao = {
  id: number;
  matricula: string;
  nome: string;
  secretaria_nome: string | null;
  data_admissao: string | null;
  data_rescisao: string | null;
  rescisao_descricao: string | null;
  cargo_atual_nome: string | null;
  vinculo_nome: string | null;
  evolucao_cargo_nome: string | null;
  evolucao_data: string | null;
  evolucao_fundamento: string | null;
  fundamento_categoria: string | null;
};

export const listEvolucoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
  const pageSize = 1000;
  const all: Evolucao[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("evolucoes_funcionais")
      .select(
        "id,matricula,nome,secretaria_nome,data_admissao,data_rescisao,rescisao_descricao,cargo_atual_nome,vinculo_nome,evolucao_cargo_nome,evolucao_data,evolucao_fundamento,fundamento_categoria",
      )
      .order("matricula", { ascending: true })
      .order("evolucao_data", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Evolucao[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
  });