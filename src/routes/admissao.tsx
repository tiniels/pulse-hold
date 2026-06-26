import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listAdmissoes, type Admissao } from "@/lib/admissoes.functions";
import { listRescisoes, type Rescisao } from "@/lib/rescisoes.functions";
import { listEvolucoes } from "@/lib/evolucoes.functions";
import { LoginGate } from "@/components/rescisoes/LoginGate";
import { JornadaTimeline } from "@/components/rescisoes/JornadaTimeline";
import { GlobalPeriodFilter } from "@/components/period/GlobalPeriodFilter";
import { PeriodComparator, type MetricResult } from "@/components/period/PeriodComparator";
import { usePeriod } from "@/contexts/PeriodContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { DrillDialog, type DrillColumn } from "@/components/charts/DrillDialog";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
  PieChart, Pie, Cell, Sankey, Layer, Rectangle, LineChart, Line, AreaChart, Area,
  ScatterChart, Scatter, ZAxis, ReferenceLine,
} from "recharts";
import {
  ArrowLeft, Search, AlertTriangle, RefreshCw, TrendingUp, UserPlus,
  Users, Sparkles, Repeat, Building2, Briefcase, Download, FileText,
  Scale, Hourglass, ShieldAlert, Activity, GraduationCap, ArrowRight, Target,
} from "lucide-react";

const normPront = (s: string | null | undefined) => (s ?? "").replace(/\D+/g, "");
const normName = (s: string | null | undefined) => (s ?? "").trim().toUpperCase().replace(/\s+/g, " ");

const VINC_COLORS: Record<string, string> = {
  "Estatutário": "hsl(142 71% 45%)",
  "Estagiário": "hsl(199 89% 48%)",
  "Comissionado": "hsl(280 65% 60%)",
  "Celetista/Temporário": "hsl(38 92% 50%)",
  "Outros": "hsl(210 10% 60%)",
};

const admissoesQuery = queryOptions({
  queryKey: ["admissoes", "all"],
  queryFn: () => listAdmissoes(),
});
const rescisoesQuery = queryOptions({
  queryKey: ["rescisoes", "all"],
  queryFn: () => listRescisoes(),
});
const evolucoesQuery = queryOptions({
  queryKey: ["evolucoes", "all"],
  queryFn: () => listEvolucoes(),
});

export const Route = createFileRoute("/admissao")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admissão | Inteligência de Movimentação e Sucessão" },
      { name: "description", content: "Painel de Inteligência de Movimentação: admissões, alterações de função, transições de carreira e alertas de sucessão." },
    ],
  }),
  component: () => (
    <LoginGate>
      <AdmissaoPage />
    </LoginGate>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">Erro: {error.message}</div>
  ),
});

type Enriched = Admissao & {
  origemTipo: "Externo" | "Ex-Efetivo" | "Ex-Estagiário" | "Ex-Comissionado" | "Ex-Contrato" | "Readmissão";
  rescisaoPrevia?: Rescisao;
  destinoTipo: "Novo Efetivo" | "Novo Estagiário" | "Novo Comissionado" | "Novo Contrato" | "Alteração de Função" | "Outros";
  vacanciaDias?: number;
};

function classifyOrigem(prev: Rescisao | undefined): Enriched["origemTipo"] {
  if (!prev) return "Externo";
  const v = (prev.vinculo_categoria || prev.vinculo_nome || "").toLowerCase();
  if (v.includes("estag")) return "Ex-Estagiário";
  if (v.includes("comiss")) return "Ex-Comissionado";
  if (v.includes("efetiv") || v.includes("estatut")) return "Ex-Efetivo";
  if (v.includes("celet") || v.includes("contrat") || v.includes("tempor")) return "Ex-Contrato";
  return "Readmissão";
}
function classifyDestino(a: Admissao): Enriched["destinoTipo"] {
  if (a.tipo_movimentacao === "Alteração de Função") return "Alteração de Função";
  switch (a.vinculo_categoria) {
    case "Estatutário": return "Novo Efetivo";
    case "Estagiário": return "Novo Estagiário";
    case "Comissionado": return "Novo Comissionado";
    case "Celetista/Temporário": return "Novo Contrato";
    default: return "Outros";
  }
}

function AdmissaoPage() {
  const { data: admissoes } = useSuspenseQuery(admissoesQuery);
  const { data: rescisoes } = useSuspenseQuery(rescisoesQuery);
  const { data: evolucoes } = useSuspenseQuery(evolucoesQuery);
  const { fromISO: periodFrom, toISO: periodTo, active: periodActive } = usePeriod();

  // index rescisoes
  const { rescPorPront, rescPorNome } = useMemo(() => {
    const p = new Map<string, Rescisao[]>();
    const n = new Map<string, Rescisao[]>();
    for (const r of rescisoes) {
      const pk = normPront(r.matricula);
      if (pk) (p.get(pk) ?? p.set(pk, []).get(pk)!).push(r);
      const nk = normName(r.nome);
      if (nk) (n.get(nk) ?? n.set(nk, []).get(nk)!).push(r);
    }
    return { rescPorPront: p, rescPorNome: n };
  }, [rescisoes]);

  const enriched: Enriched[] = useMemo(() => {
    return admissoes.map((a) => {
      const pk = normPront(a.prontuario);
      const nk = normName(a.nome);
      // Match: prefer prontuário match (Readmissão / Alteração); fallback to nome (Prata da Casa)
      let prev: Rescisao | undefined;
      const byP = pk ? rescPorPront.get(pk) : undefined;
      if (byP && byP.length) {
        // most recent rescisao BEFORE admissão data
        const ad = a.data_efetiva ? new Date(a.data_efetiva).getTime() : Infinity;
        prev = [...byP]
          .filter((r) => r.data_rescisao && new Date(r.data_rescisao).getTime() <= ad)
          .sort((x, y) => y.data_rescisao.localeCompare(x.data_rescisao))[0];
      }
      if (!prev) {
        const byN = nk ? rescPorNome.get(nk) : undefined;
        if (byN && byN.length) {
          const ad = a.data_efetiva ? new Date(a.data_efetiva).getTime() : Infinity;
          prev = [...byN]
            .filter((r) => r.data_rescisao && new Date(r.data_rescisao).getTime() <= ad)
            .sort((x, y) => y.data_rescisao.localeCompare(x.data_rescisao))[0];
        }
      }
      const origemTipo = classifyOrigem(prev);
      const destinoTipo = classifyDestino(a);
      let vacanciaDias: number | undefined;
      if (prev && a.data_efetiva && prev.data_rescisao) {
        vacanciaDias = Math.max(
          0,
          Math.round(
            (new Date(a.data_efetiva).getTime() - new Date(prev.data_rescisao).getTime()) / 86400000,
          ),
        );
      }
      return { ...a, origemTipo, rescaoPrevia: prev, destinoTipo, vacanciaDias, rescisaoPrevia: prev } as Enriched;
    });
  }, [admissoes, rescPorPront, rescPorNome]);

  // ---------------- Filters ----------------
  const [search, setSearch] = useState("");
  const [secretaria, setSecretaria] = useState<string>("__all");
  const [vinculo, setVinculo] = useState<string>("__all");
  const [origem, setOrigem] = useState<string>("__all");
  const [tipo, setTipo] = useState<string>("__all");

  const secretarias = useMemo(
    () => Array.from(new Set(admissoes.map((a) => a.secretaria || "—").filter((s) => s && s !== "---"))).sort(),
    [admissoes],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((a) => {
      if (periodActive) {
        const d = a.data_efetiva ?? null;
        if (!d) return false;
        if (periodFrom && d < periodFrom) return false;
        if (periodTo && d > periodTo) return false;
      }
      if (secretaria !== "__all" && a.secretaria !== secretaria) return false;
      if (vinculo !== "__all" && a.vinculo_categoria !== vinculo) return false;
      if (origem !== "__all" && a.origemTipo !== origem) return false;
      if (tipo !== "__all" && a.tipo_movimentacao !== tipo) return false;
      if (q) {
        const blob = `${a.nome} ${a.prontuario ?? ""} ${a.cargo ?? ""} ${a.secretaria ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [enriched, search, secretaria, vinculo, origem, tipo, periodActive, periodFrom, periodTo]);

  // ---------------- Comparator metric callback ----------------
  const compareMetrics = useMemo(() => {
    return (fromISO: string, toISO: string): MetricResult[] => {
      const inRange = (d: string | null | undefined) =>
        !!d && d >= fromISO && d <= toISO;
      const adms = enriched.filter((a) => inRange(a.data_efetiva));
      const exs = rescisoes.filter((r) => inRange(r.data_rescisao));
      const novosEf = adms.filter((a) => a.destinoTipo === "Novo Efetivo");
      const prata = novosEf.filter(
        (a) => a.origemTipo === "Ex-Estagiário" || a.origemTipo === "Ex-Comissionado" || a.origemTipo === "Ex-Contrato",
      );
      const alts = adms.filter((a) => a.tipo_movimentacao === "Alteração de Função");
      return [
        { label: "Admissões", value: adms.length },
        { label: "Exonerações", value: exs.length },
        { label: "Variação Líquida", value: adms.length - exs.length },
        { label: "Novos Efetivos", value: novosEf.length },
        { label: "Aproveitamento Interno", value: prata.length },
        { label: "Alterações de Função", value: alts.length },
      ];
    };
  }, [enriched, rescisoes]);

  // ---------------- KPIs ----------------
  const kpis = useMemo(() => {
    const totalAdm = filtered.length;
    // rescisões no mesmo período (2026+)
    const minDate = filtered.reduce((m, a) => (a.data_efetiva && (!m || a.data_efetiva < m) ? a.data_efetiva : m), "" as string);
    const maxDate = filtered.reduce((m, a) => (a.data_efetiva && (!m || a.data_efetiva > m) ? a.data_efetiva : m), "" as string);
    const exonsPeriodo = rescisoes.filter((r) => r.data_rescisao && (!minDate || r.data_rescisao >= minDate) && (!maxDate || r.data_rescisao <= maxDate)).length;
    const saldo = totalAdm - exonsPeriodo;

    const efetivosOut = rescisoes.filter((r) => (r.vinculo_categoria || "").toLowerCase().includes("estatut") && r.data_rescisao && (!minDate || r.data_rescisao >= minDate) && (!maxDate || r.data_rescisao <= maxDate)).length;
    const efetivosIn = filtered.filter((a) => a.destinoTipo === "Novo Efetivo").length;
    const reposicao = efetivosOut > 0 ? (efetivosIn / efetivosOut) * 100 : null;

    const novosEfetivos = filtered.filter((a) => a.destinoTipo === "Novo Efetivo");
    const prataCasa = novosEfetivos.filter((a) => a.origemTipo === "Ex-Estagiário" || a.origemTipo === "Ex-Comissionado" || a.origemTipo === "Ex-Contrato").length;
    const prataPerc = novosEfetivos.length > 0 ? (prataCasa / novosEfetivos.length) * 100 : 0;

    const vacs = filtered.map((a) => a.vacanciaDias).filter((v): v is number => typeof v === "number");
    const vacMedia = vacs.length ? Math.round(vacs.reduce((s, v) => s + v, 0) / vacs.length) : null;

    return { totalAdm, exonsPeriodo, saldo, reposicao, prataCasa, prataPerc, novosEfetivos: novosEfetivos.length, vacMedia };
  }, [filtered, rescisoes]);

  // ---------------- Sankey ----------------
  const sankeyData = useMemo(() => {
    const origens = ["Externo", "Ex-Efetivo", "Ex-Estagiário", "Ex-Comissionado", "Ex-Contrato"] as const;
    const destinos = ["Novo Efetivo", "Novo Estagiário", "Novo Comissionado", "Novo Contrato", "Alteração de Função"] as const;
    const nodes = [...origens.map((n) => ({ name: n })), ...destinos.map((n) => ({ name: n }))];
    const links: { source: number; target: number; value: number }[] = [];
    const counts = new Map<string, number>();
    for (const a of filtered) {
      const o = origens.includes(a.origemTipo as any) ? a.origemTipo : "Externo";
      const d = destinos.includes(a.destinoTipo as any) ? a.destinoTipo : null;
      if (!d) continue;
      const key = `${o}|${d}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [k, v] of counts) {
      const [o, d] = k.split("|");
      const si = origens.indexOf(o as any);
      const di = origens.length + destinos.indexOf(d as any);
      if (si >= 0 && di >= origens.length && v > 0) links.push({ source: si, target: di, value: v });
    }
    return { nodes, links };
  }, [filtered]);

  // ---------------- Secretaria comparison ----------------
  const secComp = useMemo(() => {
    const map = new Map<string, { secretaria: string; admitidos: number; exonerados: number }>();
    for (const a of filtered) {
      const s = a.secretaria || "—";
      if (!map.has(s)) map.set(s, { secretaria: s, admitidos: 0, exonerados: 0 });
      map.get(s)!.admitidos += 1;
    }
    const minDate = filtered.reduce((m, a) => (a.data_efetiva && (!m || a.data_efetiva < m) ? a.data_efetiva : m), "" as string);
    for (const r of rescisoes) {
      if (minDate && r.data_rescisao < minDate) continue;
      const s = r.secretaria_nome || "—";
      if (!map.has(s)) map.set(s, { secretaria: s, admitidos: 0, exonerados: 0 });
      map.get(s)!.exonerados += 1;
    }
    return Array.from(map.values())
      .map((x) => ({ ...x, saldo: x.admitidos - x.exonerados }))
      .sort((a, b) => (b.admitidos + b.exonerados) - (a.admitidos + a.exonerados))
      .slice(0, 12);
  }, [filtered, rescisoes]);

  // ---------------- Cargo rotation heat ----------------
  const cargoRot = useMemo(() => {
    const map = new Map<string, { cargo: string; admitidos: number; exonerados: number }>();
    for (const a of filtered) {
      const c = (a.cargo || "—").trim();
      if (!map.has(c)) map.set(c, { cargo: c, admitidos: 0, exonerados: 0 });
      map.get(c)!.admitidos += 1;
    }
    const minDate = filtered.reduce((m, a) => (a.data_efetiva && (!m || a.data_efetiva < m) ? a.data_efetiva : m), "" as string);
    for (const r of rescisoes) {
      if (minDate && r.data_rescisao < minDate) continue;
      const c = (r.cargo_nome || "—").trim();
      if (!map.has(c)) map.set(c, { cargo: c, admitidos: 0, exonerados: 0 });
      map.get(c)!.exonerados += 1;
    }
    return Array.from(map.values())
      .map((x) => ({ ...x, turnover: x.admitidos + x.exonerados }))
      .sort((a, b) => b.turnover - a.turnover)
      .slice(0, 15);
  }, [filtered, rescisoes]);

  // ---------------- Alerts ----------------
  const alerts = useMemo(() => {
    // Morte Infantil: novo efetivo admitido recente que já saiu (rescisao posterior)
    const morteInfantil: Enriched[] = [];
    const bumerangue: Enriched[] = filtered.filter((a) => a.origemTipo !== "Externo");
    for (const a of filtered) {
      if (a.destinoTipo !== "Novo Efetivo") continue;
      // procurar rescisão posterior à admissão
      const pk = normPront(a.prontuario);
      const nk = normName(a.nome);
      const list = [...(rescPorPront.get(pk) ?? []), ...(rescPorNome.get(nk) ?? [])];
      const ad = a.data_efetiva ? new Date(a.data_efetiva).getTime() : 0;
      const after = list.find((r) => r.data_rescisao && new Date(r.data_rescisao).getTime() > ad);
      if (after) morteInfantil.push({ ...a, rescisaoPrevia: after });
    }
    return { morteInfantil, bumerangue };
  }, [filtered, rescPorPront, rescPorNome]);

  const alteracoes = useMemo(() => filtered.filter((a) => a.tipo_movimentacao === "Alteração de Função"), [filtered]);

  // ---------------- New analytics (Reformulação) ----------------

  // #1 Balanço Patrimonial — entradas por vínculo, saídas por motivo
  const minDateFiltered = useMemo(
    () => filtered.reduce((m, a) => (a.data_efetiva && (!m || a.data_efetiva < m) ? a.data_efetiva : m), "" as string),
    [filtered],
  );
  const maxDateFiltered = useMemo(
    () => filtered.reduce((m, a) => (a.data_efetiva && (!m || a.data_efetiva > m) ? a.data_efetiva : m), "" as string),
    [filtered],
  );
  const rescPeriodo = useMemo(
    () => rescisoes.filter((r) => r.data_rescisao && (!minDateFiltered || r.data_rescisao >= minDateFiltered) && (!maxDateFiltered || r.data_rescisao <= maxDateFiltered)),
    [rescisoes, minDateFiltered, maxDateFiltered],
  );

  const balanco = useMemo(() => {
    const entradas = new Map<string, number>();
    for (const a of filtered) {
      const k = a.vinculo_categoria || "Outros";
      entradas.set(k, (entradas.get(k) ?? 0) + 1);
    }
    const saidas = new Map<string, number>();
    for (const r of rescPeriodo) {
      const k = r.motivo_categoria || "Outros";
      saidas.set(k, (saidas.get(k) ?? 0) + 1);
    }
    return {
      entradas: Array.from(entradas, ([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd),
      saidas: Array.from(saidas, ([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd),
      totalE: filtered.length,
      totalS: rescPeriodo.length,
    };
  }, [filtered, rescPeriodo]);

  // #2 Envelhecimento — usar dias_permanencia (tempo casa) como proxy
  const envelhecimento = useMemo(() => {
    // Buckets de tempo de casa das saídas (proxy para % próximo da aposentadoria)
    const buckets = [
      { label: "< 5 anos", min: 0, max: 1825, qtd: 0 },
      { label: "5–15 anos", min: 1825, max: 5475, qtd: 0 },
      { label: "15–25 anos", min: 5475, max: 9125, qtd: 0 },
      { label: "≥ 25 anos (apto)", min: 9125, max: Infinity, qtd: 0 },
    ];
    for (const r of rescPeriodo) {
      const d = r.dias_permanencia ?? 0;
      for (const b of buckets) if (d >= b.min && d < b.max) { b.qtd += 1; break; }
    }
    const total = buckets.reduce((s, b) => s + b.qtd, 0);
    const aposentaveis = buckets[3].qtd;
    const pctAposentavel = total > 0 ? (aposentaveis / total) * 100 : 0;
    return { buckets, total, aposentaveis, pctAposentavel };
  }, [rescPeriodo]);

  // #3 Continuidade do Serviço Público — vacância por secretaria
  const continuidadeServico = useMemo(() => {
    const m = new Map<string, { secretaria: string; soma: number; n: number; vacancia: number }>();
    for (const a of filtered) {
      if (typeof a.vacanciaDias !== "number") continue;
      const s = a.secretaria || "—";
      if (!m.has(s)) m.set(s, { secretaria: s, soma: 0, n: 0, vacancia: 0 });
      const row = m.get(s)!;
      row.soma += a.vacanciaDias;
      row.n += 1;
    }
    const list = Array.from(m.values()).map((r) => ({ ...r, vacancia: Math.round(r.soma / r.n) }));
    return list.sort((a, b) => b.vacancia - a.vacancia).slice(0, 10);
  }, [filtered]);

  // #4 Desligamento Precoce — analítico
  const precoceAnalitico = useMemo(() => {
    const rows = alerts.morteInfantil;
    const porSec = new Map<string, number>();
    const porFaixa = { "0–6 meses": 0, "6–12 meses": 0, "12–24 meses": 0, "24–36 meses": 0 };
    const porMotivo = new Map<string, number>();
    for (const r of rows) {
      const s = r.secretaria || "—";
      porSec.set(s, (porSec.get(s) ?? 0) + 1);
      const adm = r.data_efetiva ? new Date(r.data_efetiva).getTime() : 0;
      const sai = r.rescisaoPrevia?.data_rescisao ? new Date(r.rescisaoPrevia.data_rescisao).getTime() : 0;
      const dias = (sai - adm) / 86400000;
      if (dias <= 183) porFaixa["0–6 meses"] += 1;
      else if (dias <= 365) porFaixa["6–12 meses"] += 1;
      else if (dias <= 730) porFaixa["12–24 meses"] += 1;
      else porFaixa["24–36 meses"] += 1;
      const mot = r.rescisaoPrevia?.motivo_categoria || "Não informado";
      porMotivo.set(mot, (porMotivo.get(mot) ?? 0) + 1);
    }
    return {
      total: rows.length,
      porSec: Array.from(porSec, ([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 6),
      porFaixa: Object.entries(porFaixa).map(([nome, qtd]) => ({ nome, qtd })),
      porMotivo: Array.from(porMotivo, ([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd),
    };
  }, [alerts.morteInfantil]);

  // #5 Curva de Sobrevivência — coorte de novos efetivos
  const sobrevivencia = useMemo(() => {
    const coorte = filtered.filter((a) => a.destinoTipo === "Novo Efetivo" && a.data_efetiva);
    const total = coorte.length;
    if (total === 0) return { pontos: [] as { mes: number; retidos: number; pct: number }[], total: 0, criticoMes: null as number | null };
    const meses = [1, 3, 6, 9, 12, 18, 24, 30, 36];
    const pontos = meses.map((mes) => {
      let retidos = 0;
      for (const a of coorte) {
        const pk = normPront(a.prontuario);
        const nk = normName(a.nome);
        const list = [...(rescPorPront.get(pk) ?? []), ...(rescPorNome.get(nk) ?? [])];
        const ad = new Date(a.data_efetiva!).getTime();
        const limite = ad + mes * 30 * 86400000;
        const saiuAntes = list.some((r) => {
          const t = r.data_rescisao ? new Date(r.data_rescisao).getTime() : 0;
          return t > ad && t <= limite;
        });
        if (!saiuAntes) retidos += 1;
      }
      return { mes, retidos, pct: Math.round((retidos / total) * 1000) / 10 };
    });
    // ponto crítico = maior queda entre consecutivos
    let criticoMes: number | null = null;
    let maxDrop = 0;
    for (let i = 1; i < pontos.length; i++) {
      const drop = pontos[i - 1].pct - pontos[i].pct;
      if (drop > maxDrop) { maxDrop = drop; criticoMes = pontos[i].mes; }
    }
    return { pontos, total, criticoMes };
  }, [filtered, rescPorPront, rescPorNome]);

  // #6 Índice de Acolhimento Institucional (composto)
  const acolhimento = useMemo(() => {
    const retencao12 = sobrevivencia.pontos.find((p) => p.mes === 12)?.pct ?? 0;
    const totalCom = filtered.filter((a) => a.cargo && a.secretaria).length;
    const taxaLotacao = filtered.length > 0 ? Math.round((totalCom / filtered.length) * 100) : 0;
    const integradosPercent = Math.min(100, filtered.length > 0 ? Math.round((filtered.length / Math.max(1, filtered.length)) * 100) : 0);
    const score = Math.round((retencao12 + taxaLotacao + integradosPercent) / 3);
    return {
      score,
      retencao12: Math.round(retencao12),
      taxaLotacao,
      integrados: filtered.length,
      custo: filtered.length * 4200,
    };
  }, [filtered, sobrevivencia]);

  // #7 Mobilidade Interna — trajetórias
  const mobilidade = useMemo(() => {
    const trajetorias: { de: string; para: string; qtd: number }[] = [];
    const def = (origemTipo: Enriched["origemTipo"], destinoTipo: Enriched["destinoTipo"]) => {
      const mapDe: Record<string, string> = {
        "Externo": "Externo",
        "Ex-Efetivo": "Ex-Efetivo",
        "Ex-Estagiário": "Estagiário",
        "Ex-Comissionado": "Comissionado",
        "Ex-Contrato": "Temporário",
        "Readmissão": "Readmissão",
      };
      return { de: mapDe[origemTipo], para: destinoTipo };
    };
    const counts = new Map<string, number>();
    for (const a of filtered) {
      if (a.origemTipo === "Externo") continue;
      const { de, para } = def(a.origemTipo, a.destinoTipo);
      const k = `${de}→${para}`;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    for (const [k, qtd] of counts) {
      const [de, para] = k.split("→");
      trajetorias.push({ de, para, qtd });
    }
    trajetorias.sort((a, b) => b.qtd - a.qtd);
    const taxa = filtered.length > 0
      ? Math.round((filtered.filter((a) => a.origemTipo !== "Externo").length / filtered.length) * 100)
      : 0;
    return { trajetorias: trajetorias.slice(0, 8), taxa };
  }, [filtered]);

  // #8 Matriz de Retenção — cargo
  const matrizRetencao = useMemo(() => {
    type Row = { cargo: string; criticidade: number; retencao: number; admitidos: number; exonerados: number };
    const m = new Map<string, Row>();
    for (const a of filtered) {
      const c = (a.cargo || "—").trim();
      if (!m.has(c)) m.set(c, { cargo: c, criticidade: 0, retencao: 100, admitidos: 0, exonerados: 0 });
      m.get(c)!.admitidos += 1;
    }
    for (const r of rescPeriodo) {
      const c = (r.cargo_nome || "—").trim();
      if (!m.has(c)) m.set(c, { cargo: c, criticidade: 0, retencao: 100, admitidos: 0, exonerados: 0 });
      m.get(c)!.exonerados += 1;
    }
    const rows = Array.from(m.values()).map((r) => {
      const total = r.admitidos + r.exonerados;
      const criticidade = total; // proxy: volume movimentado
      const retencao = total > 0 ? Math.round(((r.admitidos) / total) * 100) : 100;
      return { ...r, criticidade, retencao };
    });
    return rows.filter((r) => r.criticidade >= 3);
  }, [filtered, rescPeriodo]);

  // #9 Perda de Capital Intelectual
  const perdaCapital = useMemo(() => {
    const veteranos = rescPeriodo.filter((r) => (r.dias_permanencia ?? 0) >= 3650);
    const anosTotal = veteranos.reduce((s, r) => s + Math.floor((r.dias_permanencia ?? 0) / 365), 0);
    const porMotivo = new Map<string, number>();
    for (const r of veteranos) {
      const k = r.motivo_categoria || "Outros";
      porMotivo.set(k, (porMotivo.get(k) ?? 0) + 1);
    }
    return {
      total: veteranos.length,
      anosTotal,
      custo: anosTotal * 7000, // estimativa simples por ano de conhecimento
      porMotivo: Array.from(porMotivo, ([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd),
      veteranos,
    };
  }, [rescPeriodo]);

  // #10 Funil de Processamento de Admissões
  const funil = useMemo(() => {
    const total = filtered.length;
    const comCargo = filtered.filter((a) => a.cargo).length;
    const comSecretaria = filtered.filter((a) => a.secretaria).length;
    const efetivados = filtered.filter((a) => a.data_efetiva).length;
    const comVinculo = filtered.filter((a) => a.vinculo_categoria && a.vinculo_categoria !== "Outros").length;
    return [
      { etapa: "Autorizações", qtd: total },
      { etapa: "Cargo Atribuído", qtd: comCargo },
      { etapa: "Lotação Definida", qtd: comSecretaria },
      { etapa: "Vínculo Formalizado", qtd: comVinculo },
      { etapa: "Posse Efetivada", qtd: efetivados },
    ];
  }, [filtered]);

  // #11 Eficiência por Secretaria (score composto)
  const eficienciaSec = useMemo(() => {
    type Row = { secretaria: string; admissoes: number; vacancia: number; retencao: number; score: number };
    const map = new Map<string, { adm: number; vSoma: number; vN: number; precoces: number }>();
    for (const a of filtered) {
      const s = a.secretaria || "—";
      if (!map.has(s)) map.set(s, { adm: 0, vSoma: 0, vN: 0, precoces: 0 });
      const r = map.get(s)!;
      r.adm += 1;
      if (typeof a.vacanciaDias === "number") { r.vSoma += a.vacanciaDias; r.vN += 1; }
    }
    for (const m of alerts.morteInfantil) {
      const s = m.secretaria || "—";
      if (map.has(s)) map.get(s)!.precoces += 1;
    }
    const rows: Row[] = Array.from(map, ([secretaria, r]) => {
      const vacancia = r.vN > 0 ? Math.round(r.vSoma / r.vN) : 0;
      const retencao = r.adm > 0 ? Math.round((1 - r.precoces / r.adm) * 100) : 100;
      // score: 0–100 — penaliza vacância e bonifica retenção
      const score = Math.max(0, Math.min(100, Math.round(retencao - vacancia / 5)));
      return { secretaria, admissoes: r.adm, vacancia, retencao, score };
    }).filter((r) => r.admissoes >= 3);
    rows.sort((a, b) => b.score - a.score);
    return rows.slice(0, 12);
  }, [filtered, alerts.morteInfantil]);

  // #12 Linha do Tempo de Movimentações (mensal)
  const timeline = useMemo(() => {
    const m = new Map<string, { mes: string; admissoes: number; desligamentos: number }>();
    const key = (d: string) => d.slice(0, 7); // YYYY-MM
    for (const a of filtered) {
      if (!a.data_efetiva) continue;
      const k = key(a.data_efetiva);
      if (!m.has(k)) m.set(k, { mes: k, admissoes: 0, desligamentos: 0 });
      m.get(k)!.admissoes += 1;
    }
    for (const r of rescPeriodo) {
      if (!r.data_rescisao) continue;
      const k = key(r.data_rescisao);
      if (!m.has(k)) m.set(k, { mes: k, admissoes: 0, desligamentos: 0 });
      m.get(k)!.desligamentos += 1;
    }
    return Array.from(m.values())
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .map((r) => ({ ...r, saldo: r.admissoes - r.desligamentos }));
  }, [filtered, rescPeriodo]);

  // #13 Reingresso analítico
  const reingresso = useMemo(() => {
    const rows = alerts.bumerangue;
    const porModalidade = new Map<string, number>();
    const tempos: number[] = [];
    for (const r of rows) {
      const k = r.origemTipo === "Ex-Efetivo" ? "Novo concurso (após efetivo)"
        : r.origemTipo === "Ex-Estagiário" ? "Ingresso pós-estágio"
        : r.origemTipo === "Ex-Comissionado" ? "Recondução / pós-comissão"
        : r.origemTipo === "Ex-Contrato" ? "Aproveitamento de cadastro"
        : "Reingresso geral";
      porModalidade.set(k, (porModalidade.get(k) ?? 0) + 1);
      if (r.rescisaoPrevia && r.data_efetiva) {
        const t = (new Date(r.data_efetiva).getTime() - new Date(r.rescisaoPrevia.data_rescisao).getTime()) / 86400000 / 30;
        if (t > 0) tempos.push(t);
      }
    }
    const tempoMedio = tempos.length ? Math.round(tempos.reduce((s, t) => s + t, 0) / tempos.length) : 0;
    return {
      total: rows.length,
      porModalidade: Array.from(porModalidade, ([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd),
      tempoMedio,
    };
  }, [alerts.bumerangue]);

  // #14 Risco de Sucessão — cargos críticos (alta saída sem reposição equivalente)
  const riscoSucessao = useMemo(() => {
    const m = new Map<string, { cargo: string; saidas: number; entradas: number; deficit: number; veteranos: number }>();
    for (const a of filtered) {
      const c = (a.cargo || "—").trim();
      if (!m.has(c)) m.set(c, { cargo: c, saidas: 0, entradas: 0, deficit: 0, veteranos: 0 });
      m.get(c)!.entradas += 1;
    }
    for (const r of rescPeriodo) {
      const c = (r.cargo_nome || "—").trim();
      if (!m.has(c)) m.set(c, { cargo: c, saidas: 0, entradas: 0, deficit: 0, veteranos: 0 });
      const row = m.get(c)!;
      row.saidas += 1;
      if ((r.dias_permanencia ?? 0) >= 3650) row.veteranos += 1;
    }
    const rows = Array.from(m.values())
      .map((r) => ({ ...r, deficit: r.saidas - r.entradas }))
      .filter((r) => r.saidas >= 2);
    const semSucessor = rows.filter((r) => r.deficit >= 2 && r.veteranos >= 1).sort((a, b) => b.deficit - a.deficit);
    const emPreparacao = rows.filter((r) => r.deficit >= 1 && r.deficit < 2);
    const cobertos = rows.filter((r) => r.deficit <= 0);
    const coberturaPct = rows.length > 0 ? Math.round((cobertos.length / rows.length) * 100) : 100;
    return { semSucessor: semSucessor.slice(0, 8), emPreparacao: emPreparacao.length, cobertos: cobertos.length, coberturaPct };
  }, [filtered, rescPeriodo]);

  // ---------------- Drill-down ----------------
  const [openJornada, setOpenJornada] = useState<Enriched | null>(null);
  // Generic chart drill-down: a clicked chart segment opens this modal
  // listing the servidores that compose the aggregation.
  const [drillAdm, setDrillAdm] = useState<{ title: string; rows: Enriched[] } | null>(null);
  const [drillExo, setDrillExo] = useState<{ title: string; rows: Rescisao[] } | null>(null);
  const jornadaEventos = useMemo(() => {
    if (!openJornada) return [];
    const pk = normPront(openJornada.prontuario);
    return evolucoes.filter((e) => normPront((e as any).matricula) === pk);
  }, [openJornada, evolucoes]);

  function exportCsv(rows: Enriched[], filename: string) {
    const cols = ["prontuario", "nome", "cargo", "secretaria", "vinculo", "vinculo_categoria", "tipo_movimentacao", "origemTipo", "destinoTipo", "data_efetiva", "observacao"] as const;
    const csv = [cols.join(",")]
      .concat(rows.map((r) => cols.map((c) => `"${String((r as any)[c] ?? "").replace(/"/g, '""')}"`).join(",")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = filename; link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <h1 className="text-base font-bold">Painel de Monitoramento de Movimentação e Sucessão de Pessoal</h1>
            </div>
            <p className="text-xs text-muted-foreground">Departamento de Administração de Pessoal — Central de Administração de Benefícios | {filtered.length.toLocaleString("pt-BR")} registros de movimentação analisados</p>
          </div>
          <div className="flex items-center gap-2">
            <GlobalPeriodFilter />
            <Button asChild variant="ghost" size="sm"><Link to="/rescisoes">Rescisões</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="h-4 w-4" /> Voltar</Link></Button>
          </div>
        </div>
        {/* Filters */}
        <div className="border-t bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, prontuário ou cargo…" className="h-8 pl-8 text-xs" />
            </div>
            <FilterSelect value={vinculo} onChange={setVinculo} placeholder="Natureza do Vínculo" options={Object.keys(VINC_COLORS)} />
            <FilterSelect value={tipo} onChange={setTipo} placeholder="Tipo de Movimentação" options={["Admissão", "Alteração de Função"]} />
            <FilterSelect value={origem} onChange={setOrigem} placeholder="Forma de Ingresso" options={["Externo", "Ex-Efetivo", "Ex-Estagiário", "Ex-Comissionado", "Ex-Contrato", "Readmissão"]} />
            <FilterSelect value={secretaria} onChange={setSecretaria} placeholder="Secretaria de Lotação" options={secretarias} />
            <Button variant="outline" size="sm" className="h-8" onClick={() => { setSearch(""); setSecretaria("__all"); setVinculo("__all"); setOrigem("__all"); setTipo("__all"); }}>
              <RefreshCw className="h-3 w-3" /> Limpar Filtros
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => exportCsv(filtered, `admissoes_${new Date().toISOString().slice(0, 10)}.csv`)}>
              <Download className="h-3 w-3" /> Exportar Relatório
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* CAMADA 1 — Visão Executiva (KPIs principais) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Kpi title="Total de Admissões no Período" value={kpis.totalAdm.toLocaleString("pt-BR")} icon={<Users className="h-4 w-4" />} accent="emerald" />
          <Kpi title="Variação Líquida do Quadro Funcional" value={(kpis.saldo > 0 ? "+" : "") + kpis.saldo.toLocaleString("pt-BR")}
               sub={`${kpis.exonsPeriodo} desligamentos`} icon={<Scale className="h-4 w-4" />}
               accent={kpis.saldo >= 0 ? "emerald" : "rose"} />
          <Kpi title="Taxa de Reposição de Cargos Efetivos" value={kpis.reposicao == null ? "—" : `${kpis.reposicao.toFixed(0)}%`}
               sub={`${kpis.novosEfetivos} servidores efetivos nomeados`} icon={<RefreshCw className="h-4 w-4" />} accent="sky"
               meta={85} actual={kpis.reposicao ?? 0} />
          <Kpi title="Aproveitamento de Servidores Internos" value={`${kpis.prataPerc.toFixed(0)}%`}
               sub={`${kpis.prataCasa} servidores reaproveitados`} icon={<Sparkles className="h-4 w-4" />} accent="amber"
               meta={20} actual={kpis.prataPerc} />
          <Kpi title="Tempo Médio de Vacância" value={kpis.vacMedia == null ? "—" : `${kpis.vacMedia} dias`}
               sub="Saída do titular → posse do substituto" icon={<Hourglass className="h-4 w-4" />} accent="violet" />
        </div>

        {/* KPIs adicionais — Estabilidade Estrutural */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Kpi title="Taxa de Retenção (12 meses)" value={`${acolhimento.retencao12}%`} sub="Servidores efetivos retidos após 12 meses de posse"
               icon={<Activity className="h-4 w-4" />} accent="emerald" meta={85} actual={acolhimento.retencao12} />
          <Kpi title="Índice de Encarreiramento Interno" value={`${mobilidade.taxa}%`} sub="Movimentações originadas dentro do quadro"
               icon={<GraduationCap className="h-4 w-4" />} accent="sky" meta={15} actual={mobilidade.taxa} />
          <Kpi title="Índice de Acolhimento Institucional" value={`${acolhimento.score}/100`} sub={`${acolhimento.integrados} servidores integrados no período`}
               icon={<Target className="h-4 w-4" />} accent="amber" meta={80} actual={acolhimento.score} />
        </div>

        {/* CAMADA 2 — Painéis analíticos */}
        <Tabs defaultValue="estabilidade" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="estabilidade">Estabilidade Estrutural</TabsTrigger>
            <TabsTrigger value="atrito">Diagnóstico de Atrito</TabsTrigger>
            <TabsTrigger value="talentos">Mapeamento de Talentos</TabsTrigger>
            <TabsTrigger value="eficiencia">Eficiência Operacional</TabsTrigger>
            <TabsTrigger value="risco">Indicadores de Risco de Sucessão</TabsTrigger>
            <TabsTrigger value="detalhes">Análise Detalhada</TabsTrigger>
          </TabsList>

          {/* ---------- ESTABILIDADE ESTRUTURAL ---------- */}
          <TabsContent value="estabilidade" className="space-y-4">
            {/* #1 Balanço Patrimonial */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Scale className="h-4 w-4" /> Balanço Patrimonial de Pessoal</CardTitle>
                <p className="text-[10px] text-muted-foreground">Composição analítica de entradas e saídas do quadro funcional no período.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <BalancoColuna titulo="ENTRADAS" total={balanco.totalE} linhas={balanco.entradas} tom="emerald" />
                  <BalancoColuna titulo="SAÍDAS" total={balanco.totalS} linhas={balanco.saidas} tom="rose" />
                </div>
                <div className="mt-4 pt-4 border-t text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Variação Líquida do Quadro</p>
                  <p className={`text-3xl font-bold ${kpis.saldo >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {kpis.saldo >= 0 ? "+" : ""}{kpis.saldo.toLocaleString("pt-BR")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* #12 Série histórica */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Série Histórica de Movimentações</CardTitle>
                <p className="text-[10px] text-muted-foreground">Admissões, desligamentos e saldo mensal — para identificação de padrões sazonais.</p>
              </CardHeader>
              <CardContent className="h-80">
                {timeline.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem dados no período.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RTooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="admissoes" name="Admissões" stroke="hsl(142 71% 45%)" strokeWidth={2} />
                      <Line type="monotone" dataKey="desligamentos" name="Desligamentos" stroke="hsl(0 84% 60%)" strokeWidth={2} />
                      <Line type="monotone" dataKey="saldo" name="Saldo" stroke="hsl(217 91% 60%)" strokeWidth={2} strokeDasharray="4 4" />
                      <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* #2 Envelhecimento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Distribuição por Tempo de Casa (Desligados)</CardTitle>
                  <p className="text-[10px] text-muted-foreground">Proxy para envelhecimento e risco de aposentadoria — {envelhecimento.pctAposentavel.toFixed(0)}% saíram com ≥25 anos de serviço.</p>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={envelhecimento.buckets}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RTooltip />
                      <Bar dataKey="qtd" name="Servidores" fill="hsl(280 65% 60%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              {/* #11 Eficiência por Secretaria */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Ranking de Eficiência por Secretaria</CardTitle>
                  <p className="text-[10px] text-muted-foreground">Score composto: retenção × vacância. Quanto maior, melhor a gestão de pessoal.</p>
                </CardHeader>
                <CardContent className="h-72 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Secretaria</TableHead>
                        <TableHead className="text-[10px] text-right">Admissões</TableHead>
                        <TableHead className="text-[10px] text-right">Vacância</TableHead>
                        <TableHead className="text-[10px] text-right">Retenção</TableHead>
                        <TableHead className="text-[10px] text-right">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eficienciaSec.map((r) => (
                        <TableRow key={r.secretaria}>
                          <TableCell className="text-[11px]">{r.secretaria}</TableCell>
                          <TableCell className="text-[11px] text-right">{r.admissoes}</TableCell>
                          <TableCell className={`text-[11px] text-right ${r.vacancia > 90 ? "text-rose-600" : r.vacancia > 60 ? "text-amber-600" : "text-emerald-600"}`}>{r.vacancia}d</TableCell>
                          <TableCell className="text-[11px] text-right">{r.retencao}%</TableCell>
                          <TableCell className={`text-[11px] text-right font-semibold ${r.score >= 70 ? "text-emerald-600" : r.score >= 50 ? "text-amber-600" : "text-rose-600"}`}>{r.score}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ---------- DIAGNÓSTICO DE ATRITO ---------- */}
          <TabsContent value="atrito" className="space-y-4">
            <AlertCardFormal
              titulo="DESLIGAMENTO PRECOCE DE NOVOS EFETIVOS"
              valor={precoceAnalitico.total}
              descricao="Servidores efetivos que solicitaram exoneração dentro do período inicial de estágio probatório (3 anos, CF/88 art. 41)."
            />

            {/* #4 Painel analítico desligamento precoce */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs">Por Secretaria de Lotação</CardTitle></CardHeader>
                <CardContent className="h-64">
                  {precoceAnalitico.porSec.length === 0 ? <Empty /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={precoceAnalitico.porSec} layout="vertical" margin={{ left: 100 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="nome" width={100} tick={{ fontSize: 10 }} />
                        <RTooltip />
                        <Bar dataKey="qtd" fill="hsl(0 84% 60%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs">Por Tempo Decorrido até Exoneração</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={precoceAnalitico.porFaixa}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RTooltip />
                      <Bar dataKey="qtd" fill="hsl(38 92% 50%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* #5 Curva de sobrevivência */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Curva de Retenção — Servidores Efetivos Recém-Empossados</CardTitle>
                <p className="text-[10px] text-muted-foreground">
                  Coorte de {sobrevivencia.total} servidores. {sobrevivencia.criticoMes ? `Ponto crítico identificado no mês ${sobrevivencia.criticoMes} — recomenda-se reforço do programa de acolhimento institucional anterior a esse marco.` : "Sem ponto crítico evidente."}
                </p>
              </CardHeader>
              <CardContent className="h-80">
                {sobrevivencia.pontos.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sobrevivencia.pontos}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} label={{ value: "Meses após posse", position: "insideBottom", offset: -5, fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                      <RTooltip formatter={(v: number) => `${v}%`} />
                      <Area type="monotone" dataKey="pct" name="Retenção" stroke="hsl(142 71% 45%)" fill="hsl(142 71% 45% / 0.2)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* #6 Acolhimento composto */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Índice de Acolhimento Institucional</CardTitle>
                <p className="text-[10px] text-muted-foreground">Pontuação composta {acolhimento.score}/100 (meta: 80) — agrega retenção, lotação efetiva e taxa de integração.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Componente nome="Retenção no 1º ano" valor={acolhimento.retencao12} meta={75} />
                <Componente nome="Taxa de lotação definitiva" valor={acolhimento.taxaLotacao} meta={90} />
                <Componente nome="Servidores integrados no período" valor={acolhimento.integrados} meta={null} formato="num" />
                <div className="pt-2 border-t flex justify-between text-xs">
                  <span className="text-muted-foreground">Custo estimado de integração</span>
                  <span className="font-mono">R$ {acolhimento.custo.toLocaleString("pt-BR")}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------- MAPEAMENTO DE TALENTOS ---------- */}
          <TabsContent value="talentos" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Mobilidade Interna e Trajetórias de Encarreiramento</CardTitle>
                <p className="text-[10px] text-muted-foreground">Taxa de aproveitamento interno: {mobilidade.taxa}% (meta institucional: 20%).</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {mobilidade.trajetorias.length === 0 ? <Empty /> : mobilidade.trajetorias.map((t) => (
                    <div key={`${t.de}-${t.para}`} className="flex items-center justify-between gap-2 p-3 rounded-md border bg-muted/30">
                      <Badge variant="outline" className="text-[10px]">{t.de}</Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge className="text-[10px]">{t.para}</Badge>
                      <span className="ml-auto text-sm font-bold">{t.qtd}</span>
                      <span className="text-[10px] text-muted-foreground">casos</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Matriz de Retenção de Capital Intelectual</CardTitle>
                <p className="text-[10px] text-muted-foreground">Cargos plotados por criticidade (volume movimentado) × taxa de retenção. Quadrante inferior-direito = alto risco.</p>
              </CardHeader>
              <CardContent className="h-96">
                {matrizRetencao.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" dataKey="criticidade" name="Criticidade" tick={{ fontSize: 10 }}
                        label={{ value: "Criticidade (volume) →", position: "insideBottom", offset: -10, fontSize: 10 }} />
                      <YAxis type="number" dataKey="retencao" name="Retenção" unit="%" tick={{ fontSize: 10 }} domain={[0, 100]}
                        label={{ value: "↑ Retenção", angle: -90, position: "insideLeft", fontSize: 10 }} />
                      <ZAxis range={[60, 60]} />
                      <ReferenceLine x={Math.max(...matrizRetencao.map((r) => r.criticidade)) / 2} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                      <ReferenceLine y={70} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                      <RTooltip cursor={{ strokeDasharray: "3 3" }}
                        content={({ payload }: any) => {
                          if (!payload?.[0]) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-background border rounded p-2 text-xs">
                              <p className="font-semibold">{d.cargo}</p>
                              <p>Admissões: {d.admitidos} · Desligamentos: {d.exonerados}</p>
                              <p>Retenção: {d.retencao}%</p>
                            </div>
                          );
                        }}
                      />
                      <Scatter data={matrizRetencao} fill="hsl(217 91% 60%)" />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-600" /> Índice de Perda de Capital Intelectual</CardTitle>
                <p className="text-[10px] text-muted-foreground">Saídas de servidores com ≥10 anos de serviço — patrimônio de conhecimento institucional perdido.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <Stat label="Servidores veteranos desligados" value={perdaCapital.total.toLocaleString("pt-BR")} />
                  <Stat label="Anos acumulados de experiência" value={`${perdaCapital.anosTotal.toLocaleString("pt-BR")} anos`} />
                  <Stat label="Custo estimado de reposição" value={`R$ ${perdaCapital.custo.toLocaleString("pt-BR")}`} />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Distribuição por motivo</p>
                  {perdaCapital.porMotivo.map((m) => {
                    const pct = perdaCapital.total > 0 ? (m.qtd / perdaCapital.total) * 100 : 0;
                    return (
                      <div key={m.nome} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span>{m.nome}</span>
                          <span className="text-muted-foreground">{m.qtd} ({pct.toFixed(0)}%)</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------- EFICIÊNCIA OPERACIONAL ---------- */}
          <TabsContent value="eficiencia" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Funil de Processamento de Admissões</CardTitle>
                <p className="text-[10px] text-muted-foreground">Estágios mensuráveis do processamento — etapas com maior queda indicam gargalos burocráticos.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {funil.map((f, i) => {
                  const max = funil[0]?.qtd || 1;
                  const pct = (f.qtd / max) * 100;
                  const conversao = i > 0 && funil[i - 1].qtd > 0 ? Math.round((f.qtd / funil[i - 1].qtd) * 100) : 100;
                  return (
                    <div key={f.etapa} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-medium">{f.etapa}</span>
                        <span className="text-muted-foreground">{f.qtd.toLocaleString("pt-BR")} {i > 0 && <span className="ml-2 text-[10px]">({conversao}% do anterior)</span>}</span>
                      </div>
                      <div className="h-6 rounded bg-muted overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-sky-500 to-sky-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* #3 Continuidade do serviço */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Índice de Continuidade do Serviço Público</CardTitle>
                <p className="text-[10px] text-muted-foreground">Tempo médio de vacância por secretaria — quanto maior, maior o impacto no atendimento ao cidadão. Meta institucional: &lt; 60 dias.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {continuidadeServico.length === 0 ? <Empty /> : continuidadeServico.map((c) => {
                  const cor = c.vacancia > 90 ? "bg-rose-500" : c.vacancia > 60 ? "bg-amber-500" : "bg-emerald-500";
                  return (
                    <div key={c.secretaria} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span>{c.secretaria}</span>
                        <span className={`font-mono ${c.vacancia > 90 ? "text-rose-600" : c.vacancia > 60 ? "text-amber-600" : "text-emerald-600"}`}>{c.vacancia} dias</span>
                      </div>
                      <div className="h-2 rounded bg-muted overflow-hidden">
                        <div className={`h-full ${cor}`} style={{ width: `${Math.min(100, (c.vacancia / 200) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t text-[11px] text-muted-foreground">
                  ⚠ {filtered.filter((a) => (a.vacanciaDias ?? 0) > 90).length} vagas com vacância superior a 90 dias.
                </div>
              </CardContent>
            </Card>

            {/* Sankey original mantido como visualização sistêmica */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Fluxo Sistêmico: Forma de Ingresso → Destino</CardTitle></CardHeader>
              <CardContent className="h-[420px]">
                {sankeyData.links.length === 0 ? <Empty /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <Sankey data={sankeyData} nodePadding={20} margin={{ left: 10, right: 100, top: 10, bottom: 10 }}
                      link={{ stroke: "hsl(217 91% 60% / 0.35)" }} node={<SankeyNode />}>
                      <RTooltip />
                    </Sankey>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------- RISCO DE SUCESSÃO ---------- */}
          <TabsContent value="risco" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <AlertCard title="🚨 Desligamento Precoce" value={alerts.morteInfantil.length} description="Servidores efetivos exonerados no estágio probatório." />
              <AlertCard title="🔄 Reingresso de Servidores" value={alerts.bumerangue.length} description="Reintegração, recondução ou novo ingresso após desligamento prévio." />
              <AlertCard title="⏳ Vacâncias > 90 dias" value={filtered.filter((a) => (a.vacanciaDias ?? 0) > 90).length} description="Possível déficit de atendimento ao cidadão." />
            </div>

            {/* #13 Reingresso analítico */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Reingresso de Servidores ao Quadro Funcional</CardTitle>
                <p className="text-[10px] text-muted-foreground">Total: {reingresso.total} reingressos · Tempo médio entre desligamento e reingresso: {reingresso.tempoMedio} meses.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Classificação por modalidade</p>
                  {reingresso.porModalidade.map((m) => {
                    const pct = reingresso.total > 0 ? (m.qtd / reingresso.total) * 100 : 0;
                    return (
                      <div key={m.nome} className="space-y-1 mb-2">
                        <div className="flex justify-between text-[11px]">
                          <span>{m.nome}</span>
                          <span className="text-muted-foreground">{m.qtd} ({pct.toFixed(0)}%)</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2 border-t text-[11px] text-muted-foreground space-y-1">
                  <p>🟢 <b>Positivo:</b> reingressos por novo concurso demonstram atratividade institucional.</p>
                  <p>🟡 <b>Neutro:</b> reintegração / recondução por obrigação legal.</p>
                  <p>🔴 <b>Investigar:</b> padrão recorrente de saída/retorno pode indicar uso estratégico do vínculo.</p>
                </div>
              </CardContent>
            </Card>

            {/* #14 Painel de risco de sucessão */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Painel de Risco de Sucessão — Cargos Críticos</CardTitle>
                <p className="text-[10px] text-muted-foreground">Índice de cobertura sucessória: {riscoSucessao.coberturaPct}% (meta: 90%) · {riscoSucessao.cobertos} cargos com sucessor pronto · {riscoSucessao.emPreparacao} em preparação · {riscoSucessao.semSucessor.length} sem sucessor.</p>
              </CardHeader>
              <CardContent>
                {riscoSucessao.semSucessor.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">✓ Nenhum cargo identificado sem sucessor para os filtros atuais.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Cargo / Função</TableHead>
                        <TableHead className="text-[10px] text-right">Desligamentos</TableHead>
                        <TableHead className="text-[10px] text-right">Admissões</TableHead>
                        <TableHead className="text-[10px] text-right">Déficit</TableHead>
                        <TableHead className="text-[10px] text-right">Veteranos saídos</TableHead>
                        <TableHead className="text-[10px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {riscoSucessao.semSucessor.map((r) => (
                        <TableRow key={r.cargo}>
                          <TableCell className="text-[11px] font-medium">{r.cargo}</TableCell>
                          <TableCell className="text-[11px] text-right">{r.saidas}</TableCell>
                          <TableCell className="text-[11px] text-right">{r.entradas}</TableCell>
                          <TableCell className="text-[11px] text-right text-rose-600 font-semibold">−{r.deficit}</TableCell>
                          <TableCell className="text-[11px] text-right">{r.veteranos}</TableCell>
                          <TableCell><Badge variant="destructive" className="text-[10px]">Sem sucessor</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------- DIAGNÓSTICO ANTIGO (Transição) ---------- */}
          <TabsContent value="atrito-old" className="hidden">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Fluxo Origem → Destino</CardTitle></CardHeader>
              <CardContent className="h-[420px]">
                {sankeyData.links.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem dados para os filtros atuais.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <Sankey
                      data={sankeyData}
                      nodePadding={20}
                      margin={{ left: 10, right: 100, top: 10, bottom: 10 }}
                      link={{ stroke: "hsl(217 91% 60% / 0.35)" }}
                      node={<SankeyNode />}
                    >
                      <RTooltip />
                    </Sankey>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Origem dos Novos Efetivos</CardTitle>
                  <p className="text-[10px] text-muted-foreground">Clique em uma fatia para listar os servidores.</p>
                </CardHeader>
                <CardContent className="h-72">
                  <OrigemPie
                    data={filtered.filter((a) => a.destinoTipo === "Novo Efetivo")}
                    onSelect={(name, rows) =>
                      setDrillAdm({ title: `Novos Efetivos — Origem: ${name}`, rows })
                    }
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Distribuição por Vínculo</CardTitle>
                  <p className="text-[10px] text-muted-foreground">Clique em uma fatia para listar os servidores.</p>
                </CardHeader>
                <CardContent className="h-72">
                  <VincPie
                    data={filtered}
                    onSelect={(name, rows) =>
                      setDrillAdm({ title: `Vínculo: ${name}`, rows })
                    }
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Alterações de Função ({alteracoes.length})</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => exportCsv(alteracoes, "alteracoes_funcao.csv")}>
                  <FileText className="h-3 w-3" /> Gerar Memo (CSV)
                </Button>
              </CardHeader>
              <CardContent>
                <ServidoresTable rows={alteracoes} onRowClick={setOpenJornada} compact />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------- ANÁLISE DETALHADA (Camada 3) ---------- */}
          <TabsContent value="detalhes" className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição por Secretaria e Cargo</CardTitle></CardHeader>
              <CardContent className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={secComp} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="secretaria" tick={{ fontSize: 11 }} width={100} />
                    <RTooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="admitidos" fill="hsl(142 71% 45%)" name="Admitidos" cursor="pointer"
                      onClick={(d: any) => { const sec = d?.secretaria; if (sec) setDrillAdm({ title: `Admitidos — ${sec}`, rows: filtered.filter((a) => (a.secretaria || "—") === sec) }); }} />
                    <Bar dataKey="exonerados" fill="hsl(0 84% 60%)" name="Desligados" cursor="pointer"
                      onClick={(d: any) => { const sec = d?.secretaria; if (sec) setDrillExo({ title: `Desligados — ${sec}`, rows: rescPeriodo.filter((r) => (r.secretaria_nome || "—") === sec) }); }} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Desligamento Precoce — Servidores Efetivos Exonerados no Período Inicial</CardTitle></CardHeader>
              <CardContent>
                <ServidoresTable rows={alerts.morteInfantil} onRowClick={setOpenJornada} showRescisao />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Reingresso de Servidores — Análise de Retorno ao Quadro Funcional</CardTitle></CardHeader>
              <CardContent>
                <ServidoresTable rows={alerts.bumerangue} onRowClick={setOpenJornada} showRescisao reingresso />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Alterações de Função ({alteracoes.length})</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => exportCsv(alteracoes, "alteracoes_funcao.csv")}>
                  <FileText className="h-3 w-3" /> Gerar Memo (CSV)
                </Button>
              </CardHeader>
              <CardContent>
                <ServidoresTable rows={alteracoes} onRowClick={setOpenJornada} compact />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Lista Completa de Movimentações ({filtered.length})</CardTitle></CardHeader>
              <CardContent>
                <ServidoresTable rows={filtered} onRowClick={setOpenJornada} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <PeriodComparator compute={compareMetrics} />
      </div>

      {openJornada && (
        <JornadaTimeline
          open={!!openJornada}
          onClose={() => setOpenJornada(null)}
          nome={openJornada.nome}
          matricula={openJornada.prontuario ?? ""}
          eventos={jornadaEventos as any}
        />
      )}

      {drillAdm && (
        <DrillDialog<Enriched>
          open
          onClose={() => setDrillAdm(null)}
          title={drillAdm.title}
          rows={drillAdm.rows}
          csvName={drillAdm.title}
          onRowClick={(r) => setOpenJornada(r)}
          columns={[
            { key: "prontuario", label: "Prontuário", value: (r) => r.prontuario ?? "" },
            { key: "nome", label: "Nome", value: (r) => r.nome },
            { key: "cargo", label: "Cargo", value: (r) => r.cargo ?? "" },
            { key: "secretaria", label: "Secretaria", value: (r) => r.secretaria ?? "" },
            { key: "vinculo_categoria", label: "Vínculo", value: (r) => r.vinculo_categoria },
            { key: "origemTipo", label: "Origem", value: (r) => r.origemTipo },
            { key: "data_efetiva", label: "Data Admissão", value: (r) => r.data_efetiva ?? "" },
          ]}
        />
      )}

      {drillExo && (
        <DrillDialog<Rescisao>
          open
          onClose={() => setDrillExo(null)}
          title={drillExo.title}
          rows={drillExo.rows}
          csvName={drillExo.title}
          columns={[
            { key: "matricula", label: "Matrícula", value: (r) => r.matricula ?? "" },
            { key: "nome", label: "Nome", value: (r) => r.nome },
            { key: "cargo_nome", label: "Cargo", value: (r) => r.cargo_nome },
            { key: "secretaria_nome", label: "Secretaria", value: (r) => r.secretaria_nome },
            { key: "vinculo_categoria", label: "Vínculo", value: (r) => r.vinculo_categoria },
            { key: "motivo_categoria", label: "Motivo", value: (r) => (r as any).motivo_categoria ?? "" },
            { key: "data_rescisao", label: "Data Rescisão", value: (r) => r.data_rescisao },
          ]}
        />
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__all">Todos ({placeholder})</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Kpi({ title, value, sub, icon, accent, meta, actual }: { title: string; value: string; sub?: string; icon: React.ReactNode; accent: "emerald" | "sky" | "amber" | "violet" | "rose"; meta?: number; actual?: number }) {
  const cls = {
    emerald: "from-emerald-500/10 to-emerald-500/0 text-emerald-700 dark:text-emerald-300",
    sky: "from-sky-500/10 to-sky-500/0 text-sky-700 dark:text-sky-300",
    amber: "from-amber-500/10 to-amber-500/0 text-amber-700 dark:text-amber-300",
    violet: "from-violet-500/10 to-violet-500/0 text-violet-700 dark:text-violet-300",
    rose: "from-rose-500/10 to-rose-500/0 text-rose-700 dark:text-rose-300",
  }[accent];
  const metaStatus = meta != null && actual != null
    ? (actual >= meta ? "🟢" : actual >= meta * 0.7 ? "🟡" : "🔴")
    : null;
  return (
    <Card className={`bg-gradient-to-br ${cls} border`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wide font-medium opacity-80">{title}</p>
          <span className="opacity-70">{icon}</span>
        </div>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {sub && <p className="text-[10px] opacity-70 mt-0.5">{sub}</p>}
        {meta != null && (
          <p className="text-[10px] opacity-80 mt-1">{metaStatus} Meta: {meta}%</p>
        )}
      </CardContent>
    </Card>
  );
}

function AlertCard({ title, value, description }: { title: string; value: number; description: string }) {
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-2xl font-bold mt-1">{value.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ServidoresTable({ rows, onRowClick, compact: _compact, showRescisao, reingresso }: { rows: Enriched[]; onRowClick: (r: Enriched) => void; compact?: boolean; showRescisao?: boolean; reingresso?: boolean }) {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const slice = rows.slice(page * pageSize, (page + 1) * pageSize);
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Prontuário</TableHead>
              <TableHead>Nome do Servidor</TableHead>
              <TableHead>Cargo / Função</TableHead>
              <TableHead>Secretaria de Lotação</TableHead>
              <TableHead>{reingresso ? "Natureza do Vínculo Atual" : "Natureza do Vínculo"}</TableHead>
              <TableHead>{reingresso ? "Modalidade de Desligamento Anterior" : "Forma de Ingresso"}</TableHead>
              <TableHead>{reingresso ? "Data do Reingresso" : "Data de Posse"}</TableHead>
              {showRescisao && <TableHead>{reingresso ? "Data do Desligamento Anterior" : "Data de Exoneração"}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((r) => (
              <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onRowClick(r)}>
                <TableCell className="font-mono text-xs">{r.prontuario}</TableCell>
                <TableCell className="text-xs font-medium">{r.nome}</TableCell>
                <TableCell className="text-xs">{r.cargo}</TableCell>
                <TableCell className="text-xs">{r.secretaria}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]" style={{ borderColor: VINC_COLORS[r.vinculo_categoria] ?? undefined, color: VINC_COLORS[r.vinculo_categoria] ?? undefined }}>{r.vinculo_categoria}</Badge></TableCell>
                <TableCell><Badge variant={r.origemTipo === "Externo" ? "secondary" : "default"} className="text-[10px]">{r.origemTipo}</Badge></TableCell>
                <TableCell className="text-xs">{r.data_efetiva}</TableCell>
                {showRescisao && <TableCell className="text-xs text-rose-600">{r.rescisaoPrevia?.data_rescisao ?? "—"}</TableCell>}
              </TableRow>
            ))}
            {slice.length === 0 && (
              <TableRow><TableCell colSpan={showRescisao ? 8 : 7} className="text-center text-xs text-muted-foreground py-6">Sem registros.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {rows.length > pageSize && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Total: {rows.length} registros | Exibindo página {page + 1} de {Math.ceil(rows.length / pageSize)}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button size="sm" variant="outline" disabled={(page + 1) * pageSize >= rows.length} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrigemPie({
  data,
  onSelect,
}: {
  data: Enriched[];
  onSelect?: (name: string, rows: Enriched[]) => void;
}) {
  const counts = new Map<string, number>();
  for (const a of data) counts.set(a.origemTipo, (counts.get(a.origemTipo) ?? 0) + 1);
  const arr = Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  const COLORS = ["hsl(210 10% 60%)", "hsl(142 71% 45%)", "hsl(199 89% 48%)", "hsl(280 65% 60%)", "hsl(38 92% 50%)", "hsl(0 84% 60%)"];
  if (arr.length === 0) return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem novos efetivos.</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={arr}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={40}
          label={(p: any) => `${p.name}: ${p.value}`}
          cursor={onSelect ? "pointer" : undefined}
          onClick={(d: any) => {
            if (!onSelect || !d?.name) return;
            onSelect(d.name, data.filter((a) => a.origemTipo === d.name));
          }}
        >
          {arr.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <RTooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
function VincPie({
  data,
  onSelect,
}: {
  data: Enriched[];
  onSelect?: (name: string, rows: Enriched[]) => void;
}) {
  const counts = new Map<string, number>();
  for (const a of data) counts.set(a.vinculo_categoria, (counts.get(a.vinculo_categoria) ?? 0) + 1);
  const arr = Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={arr}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={40}
          label={(p: any) => `${p.name}: ${p.value}`}
          cursor={onSelect ? "pointer" : undefined}
          onClick={(d: any) => {
            if (!onSelect || !d?.name) return;
            onSelect(d.name, data.filter((a) => a.vinculo_categoria === d.name));
          }}
        >
          {arr.map((d, i) => <Cell key={i} fill={VINC_COLORS[d.name] ?? "hsl(210 10% 60%)"} />)}
        </Pie>
        <RTooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

function SankeyNode({ x, y, width, height, index, payload }: any) {
  const isSource = index < 5;
  const color = isSource ? "hsl(199 89% 48%)" : "hsl(142 71% 45%)";
  return (
    <Layer>
      <Rectangle x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.85} />
      <text x={isSource ? x - 6 : x + width + 6} y={y + height / 2} textAnchor={isSource ? "end" : "start"} dominantBaseline="middle" fontSize={11} fill="currentColor">
        {payload.name} ({payload.value})
      </text>
    </Layer>
  );
}