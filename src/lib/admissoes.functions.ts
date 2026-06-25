import { createServerFn } from "@tanstack/react-start";

export type Admissao = {
  id: number;
  prontuario: string | null;
  nome: string;
  cargo: string | null;
  secretaria: string | null;
  observacao: string | null;
  memorando: string | null;
  telefone: string | null;
  vinculo: string | null;
  vinculo_categoria: string;
  tipo_movimentacao: string;
  data_header: string | null;
  data_efetiva: string | null;
};

export const listAdmissoes = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const pageSize = 1000;
  const all: Admissao[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseAdmin
      .from("admissoes")
      .select("*")
      .order("data_efetiva", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Admissao[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
});