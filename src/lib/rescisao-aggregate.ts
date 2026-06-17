import type { Rescisao } from "./rescisoes.functions";
import type { Evolucao } from "./evolucoes.functions";

// normalize matricula: strip non-digits + leading zeros
export function normMat(m: string | null | undefined): string {
  if (!m) return "";
  return String(m).replace(/\D+/g, "").replace(/^0+/, "");
}

export type Aggregated = Rescisao & {
  hasEvolucao: boolean;
  numEvolucoes: number;
  ultimaEvolucaoData: string | null;
  diasUltimaEvolAteRescisao: number | null;
  diasTotaisCasa: number | null;
  fundamentosUnicos: Set<string>;
  eventos: Evolucao[];
};

const MS_DAY = 86_400_000;
function diffDays(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.round((db - da) / MS_DAY);
}

export function buildAggregated(rescisoes: Rescisao[], evolucoes: Evolucao[]): Aggregated[] {
  const byMat = new Map<string, Evolucao[]>();
  for (const e of evolucoes) {
    const k = normMat(e.matricula);
    const arr = byMat.get(k);
    if (arr) arr.push(e); else byMat.set(k, [e]);
  }
  for (const arr of byMat.values()) {
    arr.sort((a, b) => (a.evolucao_data ?? "").localeCompare(b.evolucao_data ?? ""));
  }

  return rescisoes.map((r) => {
    const k = normMat(r.matricula);
    const eventos = byMat.get(k) ?? [];
    // Evoluções "reais" (excluindo registro de admissão)
    const reais = eventos.filter((e) => (e.fundamento_categoria ?? "") !== "Admissão");
    const ultima = reais.length ? reais[reais.length - 1].evolucao_data : null;
    const fundamentos = new Set<string>();
    for (const e of eventos) {
      if (e.fundamento_categoria) fundamentos.add(e.fundamento_categoria);
    }
    return {
      ...r,
      hasEvolucao: reais.length > 0,
      numEvolucoes: reais.length,
      ultimaEvolucaoData: ultima,
      diasUltimaEvolAteRescisao: ultima ? diffDays(ultima, r.data_rescisao) : null,
      diasTotaisCasa: diffDays(r.data_admissao, r.data_rescisao),
      fundamentosUnicos: fundamentos,
      eventos,
    };
  });
}