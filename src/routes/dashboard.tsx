import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getDashboardData } from "@/lib/dpcab.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import {
  AlertTriangle, Clock, CheckCircle2, Users, Briefcase, FileWarning,
  TrendingUp, Calendar, FileText, Download, ExternalLink,
} from "lucide-react";
import { FilaConvocacaoDialog } from "@/components/FilaConvocacaoDialog";
import { getCargoInfo, formatBRL, nivelTone } from "@/lib/cargo-info";
import { LoginGate } from "@/components/rescisoes/LoginGate";
import { GlobalPeriodFilter } from "@/components/period/GlobalPeriodFilter";
import { PeriodComparator, type MetricResult } from "@/components/period/PeriodComparator";
import { usePeriod } from "@/contexts/PeriodContext";
import { DrillDialog } from "@/components/charts/DrillDialog";

const dashQuery = queryOptions({
  queryKey: ["dpcab", "dashboard"],
  queryFn: () => getDashboardData(),
});

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "DP - CAB | Dashboard de Concursos e Processos Seletivos" },
      { name: "description", content: "Painel executivo e operacional do Departamento Admissional: concursos públicos, processos seletivos e monitoramento de vencimentos." },
      { property: "og:title", content: "DP - CAB | Dashboard" },
      { property: "og:description", content: "Painel executivo do Departamento Admissional." },
    ],
  }),
  component: () => (
    <LoginGate>
      <Index />
    </LoginGate>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">Erro ao carregar: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-8">Não encontrado</div>,
});

function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function IndexPeriodComparator({
  cp,
  ps,
  venc,
}: {
  cp: Array<{ data_homologacao?: string | null; total_disponivel?: number | null }>;
  ps: Array<{ data_homologacao?: string | null; total_disponivel?: number | null }>;
  venc: Array<{ vencimento_original?: string | null; status?: string | null }>;
}) {
  return (
    <PeriodComparator
      compute={(fromISO, toISO) => {
        const inRange = (d?: string | null) => !!d && d >= fromISO && d <= toISO;
        const cpH = cp.filter((r) => inRange(r.data_homologacao));
        const psH = ps.filter((r) => inRange(r.data_homologacao));
        const vencP = venc.filter((v) => inRange(v.vencimento_original));
        const criticos = vencP.filter(
          (v) => (v.status || "").toUpperCase().includes("CRÍT") || (v.status || "").toUpperCase().includes("CRIT"),
        ).length;
        const sumDisp = (rs: Array<{ total_disponivel?: number | null }>) =>
          rs.reduce((acc, r) => acc + (r.total_disponivel ?? 0), 0);
        return [
          { label: "CP Homologados", value: cpH.length },
          { label: "PS Homologados", value: psH.length },
          { label: "Disponíveis (CP+PS)", value: sumDisp(cpH) + sumDisp(psH) },
          { label: "Vencimentos no período", value: vencP.length },
          { label: "Críticos no período", value: criticos },
        ] as MetricResult[];
      }}
    />
  );
}

function statusBadge(s: string | null | undefined) {
  if (!s) return <Badge variant="outline">—</Badge>;
  const v = s.toUpperCase();
  if (v === "CRÍTICO" || v === "CRITICO")
    return <Badge className="bg-critical text-critical-foreground hover:bg-critical/90">CRÍTICO</Badge>;
  if (v === "ATENÇÃO" || v === "ATENCAO")
    return <Badge className="bg-warning text-warning-foreground hover:bg-warning/90">ATENÇÃO</Badge>;
  if (v === "OK")
    return <Badge className="bg-success text-success-foreground hover:bg-success/90">OK</Badge>;
  if (s === "Aprovados")
    return <Badge className="bg-success text-success-foreground hover:bg-success/90">{s}</Badge>;
  if (s.startsWith("Aguardando"))
    return <Badge className="bg-warning text-warning-foreground hover:bg-warning/90">{s}</Badge>;
  if (s === "Não Temos" || s === "Não Solicitado")
    return <Badge variant="secondary">{s}</Badge>;
  return <Badge variant="outline">{s}</Badge>;
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone = "default",
  hint,
}: {
  icon: any;
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning" | "critical" | "primary";
  hint?: string;
}) {
  const toneCls = {
    default: "bg-muted text-muted-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    critical: "bg-critical/15 text-critical",
    primary: "bg-primary/10 text-primary",
  }[tone];
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${toneCls}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="text-2xl font-semibold text-foreground tabular-nums">{value}</div>
          {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Index() {
  const { data } = useSuspenseQuery(dashQuery);
  const { cp, ps, venc } = data;

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfTipo, setPdfTipo] = useState<"cp" | "ps">("cp");
  const [pdfNumero, setPdfNumero] = useState<string>("");
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [filaOpen, setFilaOpen] = useState(false);
  const [filaCargo, setFilaCargo] = useState<string | null>(null);

  // Drill-down state for clicking on chart segments.
  const [drill, setDrill] = useState<{
    title: string;
    kind: "cargo" | "status";
    rows: any[];
  } | null>(null);

  function openFila(cargo: string) {
    setFilaCargo(cargo);
    setFilaOpen(true);
  }

  function openEdital(tipo: "cp" | "ps", numero: string | null | undefined) {
    if (!numero) return;
    setPdfTipo(tipo);
    setPdfNumero(numero);
    setPdfOpen(true);
  }

  function editalUrl(tipo: "cp" | "ps", numero: string, download = false) {
    const safe = encodeURIComponent(numero);
    return `/api/public/edital/${tipo}/${safe}${download ? "?download=1" : ""}`;
  }

  useEffect(() => {
    if (!pdfOpen || !pdfNumero) return;
    let cancelled = false;
    let createdUrl: string | null = null;
    setPdfLoading(true);
    setPdfError(null);
    setPdfBlobUrl(null);
    (async () => {
      try {
        const res = await fetch(editalUrl(pdfTipo, pdfNumero));
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `Erro ${res.status}`);
        }
        const blob = await res.blob();
        const pdfBlob = blob.type === "application/pdf"
          ? blob
          : new Blob([blob], { type: "application/pdf" });
        createdUrl = URL.createObjectURL(pdfBlob);
        if (!cancelled) setPdfBlobUrl(createdUrl);
      } catch (e) {
        if (!cancelled) setPdfError((e as Error).message);
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [pdfOpen, pdfTipo, pdfNumero]);

  async function downloadEdital() {
    if (!pdfNumero) return;
    try {
      const res = await fetch(editalUrl(pdfTipo, pdfNumero, true));
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `edital_${pdfNumero.replace(/\//g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error(e);
    }
  }

  function NumeroLink({ tipo, numero }: { tipo: "cp" | "ps"; numero: string | null | undefined }) {
    if (!numero) return <span className="text-muted-foreground">—</span>;
    return (
      <button
        type="button"
        onClick={() => openEdital(tipo, numero)}
        className="inline-flex items-center gap-1 text-primary hover:underline focus:outline-none"
        title={`Abrir edital ${numero}`}
      >
        <FileText className="h-3.5 w-3.5" />
        {numero}
      </button>
    );
  }

  const kpis = useMemo(() => {
    const totalCP = cp.reduce((a, r) => a + (r.total_disponivel ?? 0), 0);
    const totalPS = ps.reduce((a, r) => a + (r.total_disponivel ?? 0), 0);
    const aprovadosCP = cp.reduce((a, r) => a + (r.qtd_aprovados ?? 0), 0);
    const aprovadosPS = ps.reduce((a, r) => a + (r.qtd_aprovados ?? 0), 0);
    const atendidos = cp.reduce((a, r) => a + (r.qtd_atendida ?? 0), 0)
      + ps.reduce((a, r) => a + (r.qtd_atendida ?? 0), 0);
    const desistencias = cp.reduce((a, r) => a + (r.desistencias_renuncias ?? 0), 0)
      + ps.reduce((a, r) => a + (r.desistencias_renuncias ?? 0), 0);
    const andamento = cp.reduce((a, r) => a + (r.pedidos_andamento ?? 0), 0)
      + ps.reduce((a, r) => a + (r.pedidos_andamento ?? 0), 0);
    const abertos = cp.reduce((a, r) => a + (r.pedidos_abertos ?? 0), 0)
      + ps.reduce((a, r) => a + (r.pedidos_abertos ?? 0), 0);
    const criticos = venc.filter(v => v.status === "CRÍTICO").length;
    const atencao = venc.filter(v => v.status === "ATENÇÃO").length;
    const ok = venc.filter(v => v.status === "OK").length;
    const semConcurso = cp.filter(r => r.homologacao_status === "Não Temos").length;
    return {
      totalCP, totalPS, aprovadosCP, aprovadosPS, atendidos, desistencias,
      andamento, abertos, criticos, atencao, ok, semConcurso,
      totalDisp: totalCP + totalPS,
    };
  }, [cp, ps, venc]);

  const topDisp = useMemo(() => {
    const map = new Map<string, { cargo: string; cp: number; ps: number }>();
    for (const r of cp) {
      const m = map.get(r.cargo) ?? { cargo: r.cargo, cp: 0, ps: 0 };
      m.cp += r.total_disponivel ?? 0;
      map.set(r.cargo, m);
    }
    for (const r of ps) {
      const m = map.get(r.cargo) ?? { cargo: r.cargo, cp: 0, ps: 0 };
      m.ps += r.total_disponivel ?? 0;
      map.set(r.cargo, m);
    }
    return [...map.values()]
      .map(x => ({ ...x, total: x.cp + x.ps }))
      .filter(x => x.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [cp, ps]);

  const statusPie = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of [...cp, ...ps]) {
      const k = r.homologacao_status ?? "—";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [cp, ps]);

  const PIE_COLORS = ["hsl(150 50% 45%)", "hsl(40 80% 55%)", "hsl(220 70% 55%)", "hsl(0 70% 55%)", "hsl(280 50% 55%)", "hsl(190 60% 45%)"];

  const filteredVenc = useMemo(() => {
    return venc.filter(v => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (q && !v.cargo.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [venc, q, statusFilter]);

  const filteredCP = useMemo(() =>
    cp.filter(r => !q || r.cargo.toLowerCase().includes(q.toLowerCase())), [cp, q]);
  const filteredPS = useMemo(() =>
    ps.filter(r => !q || r.cargo.toLowerCase().includes(q.toLowerCase())), [ps, q]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">
                DP
              </div>
              <h1 className="text-xl font-semibold text-foreground">DP - CAB</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Departamento Admissional · Concursos e Processos Seletivos
            </p>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-2 text-xs">
              <a href="/admissao" className="rounded-md border px-3 py-1.5 font-medium hover:bg-accent">Admissão</a>
              <a href="/rescisoes" className="rounded-md border px-3 py-1.5 font-medium hover:bg-accent">Rescisões</a>
            </nav>
            <GlobalPeriodFilter />
            <div className="text-right text-xs text-muted-foreground">
              <div>Secretaria Municipal de Administração</div>
              <div>Painel atualizado em tempo real</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-6 px-6 py-6">
        {/* KPIs */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Kpi icon={Users} label="Total Disponível" value={kpis.totalDisp} tone="primary"
               hint={`CP ${kpis.totalCP} · PS ${kpis.totalPS}`} />
          <Kpi icon={CheckCircle2} label="Aprovados" value={kpis.aprovadosCP + kpis.aprovadosPS} tone="success" />
          <Kpi icon={TrendingUp} label="Em Andamento" value={kpis.andamento} tone="default" />
          <Kpi icon={Briefcase} label="Já Atendidos" value={kpis.atendidos} tone="success" />
          <Kpi icon={FileWarning} label="Desist./Renúncias" value={kpis.desistencias} tone="warning" />
          <Kpi icon={AlertTriangle} label="Vencim. Críticos" value={kpis.criticos} tone="critical"
               hint={`Atenção: ${kpis.atencao} · OK: ${kpis.ok}`} />
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Top 10 Cargos por Disponibilidade (CP + PS)</CardTitle>
              <p className="text-[11px] text-muted-foreground">Clique numa coluna para listar os concursos/processos.</p>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full">
                <ResponsiveContainer>
                  <BarChart data={topDisp} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="cargo" type="category" width={200} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="cp"
                      stackId="a"
                      name="CP"
                      fill="hsl(220 65% 50%)"
                      cursor="pointer"
                      onClick={(d: any) => {
                        const cg = d?.cargo as string;
                        if (!cg) return;
                        setDrill({
                          title: `CP — ${cg}`,
                          kind: "cargo",
                          rows: cp.filter((r: any) => r.cargo === cg),
                        });
                      }}
                    />
                    <Bar
                      dataKey="ps"
                      stackId="a"
                      name="PS"
                      fill="hsl(150 50% 45%)"
                      cursor="pointer"
                      onClick={(d: any) => {
                        const cg = d?.cargo as string;
                        if (!cg) return;
                        setDrill({
                          title: `PS — ${cg}`,
                          kind: "cargo",
                          rows: ps.filter((r: any) => r.cargo === cg),
                        });
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição por Status</CardTitle>
              <p className="text-[11px] text-muted-foreground">Clique numa fatia para ver os concursos/processos.</p>
            </CardHeader>
            <CardContent>
              <div className="h-[320px] w-full">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={statusPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={45}
                      label={(e) => `${e.value}`}
                      cursor="pointer"
                      onClick={(d: any) => {
                        const st = d?.name as string;
                        if (!st) return;
                        const rows = [...cp, ...ps].filter(
                          (r: any) => (r.homologacao_status ?? "—") === st,
                        );
                        setDrill({
                          title: `Status: ${st}`,
                          kind: "status",
                          rows,
                        });
                      }}
                    >
                      {statusPie.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Filters */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <Input
              placeholder="Buscar cargo…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="max-w-xs"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status vencimento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos vencimentos</SelectItem>
                <SelectItem value="CRÍTICO">CRÍTICO</SelectItem>
                <SelectItem value="ATENÇÃO">ATENÇÃO</SelectItem>
                <SelectItem value="OK">OK</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto text-sm text-muted-foreground">
              {cp.length} cargos CP · {ps.length} cargos PS · {venc.length} vencimentos
            </div>
          </CardContent>
        </Card>

        {/* Tabs: CP / PS / Vencimentos */}
        <Tabs defaultValue="venc" className="space-y-4">
          <TabsList>
            <TabsTrigger value="venc">
              <Clock className="mr-2 h-4 w-4" /> Vencimentos ({filteredVenc.length})
            </TabsTrigger>
            <TabsTrigger value="cp">
              <Briefcase className="mr-2 h-4 w-4" /> Concurso Público ({filteredCP.length})
            </TabsTrigger>
            <TabsTrigger value="ps">
              <Calendar className="mr-2 h-4 w-4" /> Processo Seletivo ({filteredPS.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="venc">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monitoramento de Vencimentos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Nº</TableHead>
                        <TableHead>Homologação</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Prorrogação</TableHead>
                        <TableHead className="text-right">Dias restantes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVenc.map(v => (
                        <TableRow key={v.id}>
                          <TableCell>{statusBadge(v.status)}</TableCell>
                          <TableCell><Badge variant="outline">{v.tipo}</Badge></TableCell>
                          <TableCell className="font-medium">
                            <button onClick={() => openFila(v.cargo)} className="text-left hover:underline text-primary">{v.cargo}</button>
                          </TableCell>
                          <TableCell>
                            <NumeroLink
                              tipo={v.tipo === "CP" ? "cp" : "ps"}
                              numero={v.numero}
                            />
                          </TableCell>
                          <TableCell>{fmtDate(v.data_homologacao)}</TableCell>
                          <TableCell>{fmtDate(v.vencimento_original)}</TableCell>
                          <TableCell>{fmtDate(v.prorrogacao)}</TableCell>
                          <TableCell className="text-right tabular-nums">{v.dias_restantes ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cp">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Concursos Públicos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Nº</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aprov.</TableHead>
                        <TableHead className="text-right">Disp.</TableHead>
                        <TableHead className="text-right">Salário Real</TableHead>
                        <TableHead>Nível</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCP.map(r => {
                        const info = getCargoInfo(r.cargo);
                        return (
                          <TableRow key={r.id} className="cursor-pointer" onClick={() => openFila(r.cargo)}>
                            <TableCell className="font-medium">
                              <button onClick={(e) => { e.stopPropagation(); openFila(r.cargo); }} className="text-left hover:underline text-primary">{r.cargo}</button>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}><NumeroLink tipo="cp" numero={r.numero} /></TableCell>
                            <TableCell>{statusBadge(r.homologacao_status)}</TableCell>
                            <TableCell className="text-right tabular-nums">{r.qtd_aprovados ?? "—"}</TableCell>
                            <TableCell className="text-right tabular-nums font-semibold">{r.total_disponivel}</TableCell>
                            <TableCell className="text-right tabular-nums">{info ? formatBRL(info.salarioReal) : "—"}</TableCell>
                            <TableCell>
                              {info?.nivel?.trim()
                                ? <Badge variant="outline" className={nivelTone(info.nivel)}>{info.nivel.trim()}</Badge>
                                : <span className="text-muted-foreground text-xs">—</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ps">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Processos Seletivos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Nº</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aprov.</TableHead>
                        <TableHead className="text-right">Disp.</TableHead>
                        <TableHead className="text-right">Atend.</TableHead>
                        <TableHead className="text-right">Andam.</TableHead>
                        <TableHead className="text-right">Desist.</TableHead>
                        <TableHead>Homologação</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Prorrogação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPS.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            <button onClick={() => openFila(r.cargo)} className="text-left hover:underline text-primary">{r.cargo}</button>
                          </TableCell>
                          <TableCell><NumeroLink tipo="ps" numero={r.numero} /></TableCell>
                          <TableCell>{statusBadge(r.homologacao_status)}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.qtd_aprovados ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">{r.total_disponivel}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.qtd_atendida ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.pedidos_andamento ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.desistencias_renuncias ?? "—"}</TableCell>
                          <TableCell>{fmtDate(r.data_homologacao)}</TableCell>
                          <TableCell>{fmtDate(r.vencimento)}</TableCell>
                          <TableCell>{fmtDate(r.prorrogacao)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <IndexPeriodComparator cp={cp} ps={ps} venc={venc} />
      </main>

      <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
        <DialogContent className="max-w-6xl p-0 gap-0 sm:rounded-lg overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between gap-4 border-b px-5 py-3 space-y-0">
            <DialogTitle className="text-base">
              Edital {pdfNumero}{" "}
              <Badge variant="outline" className="ml-2">
                {pdfTipo === "cp" ? "Concurso Público" : "Processo Seletivo"}
              </Badge>
            </DialogTitle>
            <div className="flex items-center gap-2 pr-8">
              <Button variant="outline" size="sm" onClick={downloadEdital}>
                <Download className="mr-1.5 h-4 w-4" /> Baixar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pdfBlobUrl && window.open(pdfBlobUrl, "_blank")}
                disabled={!pdfBlobUrl}
              >
                <ExternalLink className="mr-1.5 h-4 w-4" /> Nova aba
              </Button>
            </div>
          </DialogHeader>
          <div className="h-[80vh] w-full bg-muted">
            {pdfLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Carregando edital…
              </div>
            ) : pdfError ? (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-destructive">
                Não foi possível carregar o edital: {pdfError}
              </div>
            ) : pdfBlobUrl ? (
              <iframe
                key={`${pdfTipo}-${pdfNumero}`}
                title={`Edital ${pdfNumero}`}
                src={`${pdfBlobUrl}#toolbar=1&navpanes=1&view=FitH`}
                className="h-full w-full"
              />
            ) : null}
          </div>
          <div className="border-t px-5 py-2 text-xs text-muted-foreground">
            Use <kbd className="rounded border bg-background px-1">Ctrl</kbd>+
            <kbd className="rounded border bg-background px-1">F</kbd> dentro do PDF para pesquisar
            palavras · setas para navegar entre páginas e resultados.
          </div>
        </DialogContent>
      </Dialog>

      <FilaConvocacaoDialog
        open={filaOpen}
        onOpenChange={setFilaOpen}
        cargoNome={filaCargo}
      />

      {drill && (
        <DrillDialog<any>
          open
          onClose={() => setDrill(null)}
          title={drill.title}
          rows={drill.rows}
          csvName={drill.title}
          columns={[
            { key: "numero", label: "Nº", value: (r) => r.numero ?? r.edital_numero ?? "" },
            { key: "cargo", label: "Cargo", value: (r) => r.cargo ?? "" },
            { key: "total_disponivel", label: "Disponíveis", value: (r) => r.total_disponivel ?? 0 },
            { key: "homologacao_status", label: "Status", value: (r) => r.homologacao_status ?? "—" },
            { key: "data_homologacao", label: "Homologação", value: (r) => r.data_homologacao ?? "" },
            { key: "vencimento", label: "Vencimento", value: (r) => r.vencimento ?? r.vencimento_original ?? "" },
          ]}
        />
      )}
    </div>
  );
}
