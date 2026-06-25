import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export const listAdmissoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase;
  const pageSize = 1000;
  const all: Admissao[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
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