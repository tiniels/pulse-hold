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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DrillDialog, type DrillColumn } from "@/components/charts/DrillDialog";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
  PieChart, Pie, Cell, Sankey, Layer, Rectangle,
} from "recharts";
import {
  ArrowLeft, Search, AlertTriangle, RefreshCw, TrendingUp, UserPlus,
  Users, Sparkles, Repeat, Building2, Briefcase, Download, FileText,
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
              <h1 className="text-base font-bold">Painel de Inteligência de Movimentação & Sucessão</h1>
            </div>
            <p className="text-xs text-muted-foreground">DP - CAB • {filtered.length.toLocaleString("pt-BR")} movimentações em análise</p>
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
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome, prontuário, cargo…" className="h-8 pl-8 text-xs" />
            </div>
            <FilterSelect value={vinculo} onChange={setVinculo} placeholder="Vínculo" options={Object.keys(VINC_COLORS)} />
            <FilterSelect value={tipo} onChange={setTipo} placeholder="Tipo" options={["Admissão", "Alteração de Função"]} />
            <FilterSelect value={origem} onChange={setOrigem} placeholder="Origem" options={["Externo", "Ex-Efetivo", "Ex-Estagiário", "Ex-Comissionado", "Ex-Contrato", "Readmissão"]} />
            <FilterSelect value={secretaria} onChange={setSecretaria} placeholder="Secretaria" options={secretarias} />
            <Button variant="outline" size="sm" className="h-8" onClick={() => { setSearch(""); setSecretaria("__all"); setVinculo("__all"); setOrigem("__all"); setTipo("__all"); }}>
              <RefreshCw className="h-3 w-3" /> Limpar
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => exportCsv(filtered, `admissoes_${new Date().toISOString().slice(0, 10)}.csv`)}>
              <Download className="h-3 w-3" /> Exportar
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Kpi title="Total Admitidos" value={kpis.totalAdm.toLocaleString("pt-BR")} icon={<Users className="h-4 w-4" />} accent="emerald" />
          <Kpi title="Saldo Líquido" value={(kpis.saldo > 0 ? "+" : "") + kpis.saldo.toLocaleString("pt-BR")}
               sub={`${kpis.exonsPeriodo} exonerados`} icon={<TrendingUp className="h-4 w-4" />}
               accent={kpis.saldo >= 0 ? "emerald" : "rose"} />
          <Kpi title="Reposição de Efetivos" value={kpis.reposicao == null ? "—" : `${kpis.reposicao.toFixed(0)}%`}
               sub={`${kpis.novosEfetivos} novos efetivos`} icon={<RefreshCw className="h-4 w-4" />} accent="sky" />
          <Kpi title="Prata da Casa" value={`${kpis.prataPerc.toFixed(0)}%`}
               sub={`${kpis.prataCasa} ex-internos viraram efetivos`} icon={<Sparkles className="h-4 w-4" />} accent="amber" />
          <Kpi title="Vacância Média" value={kpis.vacMedia == null ? "—" : `${kpis.vacMedia}d`}
               sub="Saída → Substituto" icon={<Briefcase className="h-4 w-4" />} accent="violet" />
        </div>

        <Tabs defaultValue="transicao" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transicao">Transição de Carreira</TabsTrigger>
            <TabsTrigger value="secretaria">Secretarias & Cargos</TabsTrigger>
            <TabsTrigger value="alertas">Alertas de Sucessão</TabsTrigger>
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          </TabsList>

          {/* ---------- Transição ---------- */}
          <TabsContent value="transicao" className="space-y-4">
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

          {/* ---------- Secretaria ---------- */}
          <TabsContent value="secretaria" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Admitidos vs Exonerados por Secretaria</CardTitle>
                <p className="text-[10px] text-muted-foreground">Clique em uma barra para listar os servidores correspondentes.</p>
              </CardHeader>
              <CardContent className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={secComp} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="secretaria" tick={{ fontSize: 11 }} width={100} />
                    <RTooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="admitidos"
                      fill="hsl(142 71% 45%)"
                      name="Admitidos"
                      cursor="pointer"
                      onClick={(d: any) => {
                        const sec = d?.secretaria as string | undefined;
                        if (!sec) return;
                        setDrillAdm({
                          title: `Admitidos — Secretaria: ${sec}`,
                          rows: filtered.filter((a) => (a.secretaria || "—") === sec),
                        });
                      }}
                    />
                    <Bar
                      dataKey="exonerados"
                      fill="hsl(0 84% 60%)"
                      name="Exonerados"
                      cursor="pointer"
                      onClick={(d: any) => {
                        const sec = d?.secretaria as string | undefined;
                        if (!sec) return;
                        const minDate = filtered.reduce(
                          (m, a) =>
                            a.data_efetiva && (!m || a.data_efetiva < m) ? a.data_efetiva : m,
                          "" as string,
                        );
                        const rows = rescisoes.filter(
                          (r) =>
                            (r.secretaria_nome || "—") === sec &&
                            (!minDate || r.data_rescisao >= minDate),
                        );
                        setDrillExo({
                          title: `Exonerados — Secretaria: ${sec}`,
                          rows,
                        });
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top Cargos por Turnover (Admissões + Exonerações)</CardTitle>
                <p className="text-[10px] text-muted-foreground">Clique em uma barra para listar os servidores.</p>
              </CardHeader>
              <CardContent className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cargoRot} layout="vertical" margin={{ left: 160 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="cargo" tick={{ fontSize: 10 }} width={160} />
                    <RTooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="admitidos"
                      stackId="a"
                      fill="hsl(142 71% 45%)"
                      name="Admitidos"
                      cursor="pointer"
                      onClick={(d: any) => {
                        const cg = (d?.cargo || "").trim();
                        if (!cg) return;
                        setDrillAdm({
                          title: `Admitidos — Cargo: ${cg}`,
                          rows: filtered.filter((a) => (a.cargo || "—").trim() === cg),
                        });
                      }}
                    />
                    <Bar
                      dataKey="exonerados"
                      stackId="a"
                      fill="hsl(0 84% 60%)"
                      name="Exonerados"
                      cursor="pointer"
                      onClick={(d: any) => {
                        const cg = (d?.cargo || "").trim();
                        if (!cg) return;
                        const minDate = filtered.reduce(
                          (m, a) =>
                            a.data_efetiva && (!m || a.data_efetiva < m) ? a.data_efetiva : m,
                          "" as string,
                        );
                        const rows = rescisoes.filter(
                          (r) =>
                            (r.cargo_nome || "—").trim() === cg &&
                            (!minDate || r.data_rescisao >= minDate),
                        );
                        setDrillExo({
                          title: `Exonerados — Cargo: ${cg}`,
                          rows,
                        });
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------- Alertas ---------- */}
          <TabsContent value="alertas" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <AlertCard title="🚨 Morte Infantil" value={alerts.morteInfantil.length} description="Novos efetivos que já pediram exoneração" />
              <AlertCard title="🔄 Servidores Bumerangue" value={alerts.bumerangue.length} description="Saíram e voltaram (mesmo prontuário ou nome)" />
              <AlertCard title="⏳ Vacâncias > 90 dias" value={filtered.filter((a) => (a.vacanciaDias ?? 0) > 90).length} description="Tempo entre saída e substituto" />
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Morte Infantil — Novos Efetivos que já saíram</CardTitle></CardHeader>
              <CardContent>
                <ServidoresTable rows={alerts.morteInfantil} onRowClick={setOpenJornada} showRescisao />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Servidores Bumerangue (Porta Giratória)</CardTitle></CardHeader>
              <CardContent>
                <ServidoresTable rows={alerts.bumerangue} onRowClick={setOpenJornada} showRescisao />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------- Detalhes ---------- */}
          <TabsContent value="detalhes">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Lista Completa ({filtered.length})</CardTitle></CardHeader>
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

function Kpi({ title, value, sub, icon, accent }: { title: string; value: string; sub?: string; icon: React.ReactNode; accent: "emerald" | "sky" | "amber" | "violet" | "rose" }) {
  const cls = {
    emerald: "from-emerald-500/10 to-emerald-500/0 text-emerald-700 dark:text-emerald-300",
    sky: "from-sky-500/10 to-sky-500/0 text-sky-700 dark:text-sky-300",
    amber: "from-amber-500/10 to-amber-500/0 text-amber-700 dark:text-amber-300",
    violet: "from-violet-500/10 to-violet-500/0 text-violet-700 dark:text-violet-300",
    rose: "from-rose-500/10 to-rose-500/0 text-rose-700 dark:text-rose-300",
  }[accent];
  return (
    <Card className={`bg-gradient-to-br ${cls} border`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wide font-medium opacity-80">{title}</p>
          <span className="opacity-70">{icon}</span>
        </div>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {sub && <p className="text-[10px] opacity-70 mt-0.5">{sub}</p>}
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

function ServidoresTable({ rows, onRowClick, compact, showRescisao }: { rows: Enriched[]; onRowClick: (r: Enriched) => void; compact?: boolean; showRescisao?: boolean }) {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const slice = rows.slice(page * pageSize, (page + 1) * pageSize);
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Pront.</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Secretaria</TableHead>
              <TableHead>Vínculo</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Data</TableHead>
              {showRescisao && <TableHead>Saída</TableHead>}
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
          <span className="text-muted-foreground">{rows.length} registros • página {page + 1} de {Math.ceil(rows.length / pageSize)}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button size="sm" variant="outline" disabled={(page + 1) * pageSize >= rows.length} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrigemPie({ data }: { data: Enriched[] }) {
  const counts = new Map<string, number>();
  for (const a of data) counts.set(a.origemTipo, (counts.get(a.origemTipo) ?? 0) + 1);
  const arr = Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  const COLORS = ["hsl(210 10% 60%)", "hsl(142 71% 45%)", "hsl(199 89% 48%)", "hsl(280 65% 60%)", "hsl(38 92% 50%)", "hsl(0 84% 60%)"];
  if (arr.length === 0) return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem novos efetivos.</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={arr} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label={(p: any) => `${p.name}: ${p.value}`}>
          {arr.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <RTooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
function VincPie({ data }: { data: Enriched[] }) {
  const counts = new Map<string, number>();
  for (const a of data) counts.set(a.vinculo_categoria, (counts.get(a.vinculo_categoria) ?? 0) + 1);
  const arr = Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={arr} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label={(p: any) => `${p.name}: ${p.value}`}>
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