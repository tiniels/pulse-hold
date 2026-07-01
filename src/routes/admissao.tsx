import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listAdmissoes, type Admissao } from "@/lib/admissoes.functions";
import { listRescisoes, type Rescisao } from "@/lib/rescisoes.functions";
import { listEvolucoes, type Evolucao } from "@/lib/evolucoes.functions";
import { LoginGate } from "@/components/rescisoes/LoginGate";
import { JornadaTimeline } from "@/components/rescisoes/JornadaTimeline";
import { GlobalPeriodFilter } from "@/components/period/GlobalPeriodFilter";
import { PeriodComparator, type MetricResult } from "@/components/period/PeriodComparator";
import { usePeriod } from "@/contexts/PeriodContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, LineChart, Line,
} from "recharts";
import {
  ArrowLeft, ArrowRight, Building2, Users, UserPlus, UserMinus,
  TrendingUp, TrendingDown, Scale, ChevronRight, Search, Briefcase,
  Filter, AlertTriangle, Activity, Award,
} from "lucide-react";

/* ================== helpers ================== */

const normName = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase().replace(/\s+/g, " ");
const normPront = (s: string | null | undefined) => (s ?? "").toString().replace(/\D+/g, "").replace(/^0+/, "");

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}
function inPeriod(iso: string | null | undefined, from: string | null, to: string | null): boolean {
  if (!iso) return false;
  if (!from || !to) return true;
  return iso >= from && iso <= to;
}

/* Bucket resignation categories per business rules */
type SaidaTipo = "Exoneração" | "Aposentadoria" | "Falecimento" | "Rescisão" | "Vacância" | "Outros";
function classSaida(motivo: string | null | undefined, desc: string | null | undefined): SaidaTipo {
  const t = `${motivo ?? ""} ${desc ?? ""}`.toUpperCase();
  if (/APOSENT/.test(t)) return "Aposentadoria";
  if (/(FALEC|\bOBIT|MORTE)/.test(t)) return "Falecimento";
  if (/EXONER/.test(t)) return "Exoneração";
  if (/VAC(A|Â)NCIA/.test(t)) return "Vacância";
  if (/RESCIS/.test(t)) return "Rescisão";
  return "Outros";
}

/* ================== data ================== */

const admissoesQuery = queryOptions({ queryKey: ["admissoes", "all"], queryFn: () => listAdmissoes() });
const rescisoesQuery = queryOptions({ queryKey: ["rescisoes", "all"], queryFn: () => listRescisoes() });
const evolucoesQuery = queryOptions({ queryKey: ["evolucoes", "all"], queryFn: () => listEvolucoes() });

export const Route = createFileRoute("/admissao")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Movimentação de Pessoal | Painel Executivo — DP CAB" },
      { name: "description", content: "Painel Executivo de Movimentação de Pessoal: entradas, saídas e saldo por secretaria e cargo." },
    ],
  }),
  component: () => (
    <LoginGate>
      <AdmissaoPage />
    </LoginGate>
  ),
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Erro: {error.message}</div>,
});

/* ================== main ================== */

type Saida = {
  nome: string;
  matricula: string;
  secretaria: string;
  cargo: string;
  data: string;
  tipo: SaidaTipo;
  motivo: string;
  desc: string;
  raw: Rescisao;
};
type Entrada = {
  nome: string;
  prontuario: string;
  secretaria: string;
  cargo: string;
  data: string;
  vinculo: string;
  concurso: string | null;
  raw: Admissao;
};

function AdmissaoPage() {
  const { data: admissoes } = useSuspenseQuery(admissoesQuery);
  const { data: rescisoes } = useSuspenseQuery(rescisoesQuery);
  const { data: evolucoes } = useSuspenseQuery(evolucoesQuery);
  const { fromISO, toISO } = usePeriod();

  // Local filters
  const [tipoSaida, setTipoSaida] = useState<string>("");
  const [vinculoFilter, setVinculoFilter] = useState<string>("");
  const [q, setQ] = useState("");

  // Drill-down state
  const [drillSecretaria, setDrillSecretaria] = useState<string | null>(null);
  const [drillCargo, setDrillCargo] = useState<{ secretaria: string; cargo: string } | null>(null);
  const [drillServidor, setDrillServidor] = useState<{ nome: string; matricula: string } | null>(null);
  const [drillKpi, setDrillKpi] = useState<null | "entradas" | "saidas" | "vacancias" | "aposentadorias" | "exoneracoes" | "falecimentos" | "rescisoes">(null);

  // Normalize collections
  const entradas = useMemo<Entrada[]>(() => {
    return admissoes
      .filter((a) => inPeriod(a.data_efetiva, fromISO, toISO))
      .filter((a) => !vinculoFilter || (a.vinculo_categoria ?? "").toUpperCase() === vinculoFilter.toUpperCase())
      .map((a) => ({
        nome: a.nome,
        prontuario: a.prontuario ?? "",
        secretaria: a.secretaria ?? "—",
        cargo: a.cargo ?? "—",
        data: a.data_efetiva ?? "",
        vinculo: a.vinculo_categoria ?? a.vinculo ?? "—",
        concurso: a.memorando,
        raw: a,
      }));
  }, [admissoes, fromISO, toISO, vinculoFilter]);

  const saidas = useMemo<Saida[]>(() => {
    return rescisoes
      .filter((r) => inPeriod(r.data_rescisao, fromISO, toISO))
      .filter((r) => !vinculoFilter || (r.vinculo_categoria ?? "").toUpperCase() === vinculoFilter.toUpperCase())
      .map<Saida>((r) => ({
        nome: r.nome,
        matricula: r.matricula ?? "",
        secretaria: r.secretaria_nome ?? "—",
        cargo: r.cargo_nome ?? "—",
        data: r.data_rescisao,
        tipo: classSaida(r.motivo_categoria, r.rescisao_descricao),
        motivo: r.motivo_categoria ?? "",
        desc: r.rescisao_descricao ?? "",
        raw: r,
      }))
      .filter((s) => !tipoSaida || s.tipo === tipoSaida);
  }, [rescisoes, fromISO, toISO, vinculoFilter, tipoSaida]);

  // KPIs
  const kpi = useMemo(() => {
    const totalEntradas = entradas.length;
    const totalSaidas = saidas.length;
    const porTipo = saidas.reduce<Record<string, number>>((acc, s) => {
      acc[s.tipo] = (acc[s.tipo] ?? 0) + 1;
      return acc;
    }, {});
    return {
      totalEntradas,
      totalSaidas,
      saldo: totalEntradas - totalSaidas,
      exoneracoes: porTipo["Exoneração"] ?? 0,
      aposentadorias: porTipo["Aposentadoria"] ?? 0,
      falecimentos: porTipo["Falecimento"] ?? 0,
      vacancias: porTipo["Vacância"] ?? 0,
      rescisoes: porTipo["Rescisão"] ?? 0,
    };
  }, [entradas, saidas]);

  // Aggregate by secretaria
  const bySecretaria = useMemo(() => {
    const map = new Map<string, { entraram: number; sairam: number; porTipo: Record<string, number> }>();
    const ensure = (k: string) => {
      let v = map.get(k);
      if (!v) { v = { entraram: 0, sairam: 0, porTipo: {} }; map.set(k, v); }
      return v;
    };
    for (const e of entradas) ensure(e.secretaria).entraram++;
    for (const s of saidas) {
      const v = ensure(s.secretaria);
      v.sairam++;
      v.porTipo[s.tipo] = (v.porTipo[s.tipo] ?? 0) + 1;
    }
    let arr = Array.from(map.entries()).map(([sec, v]) => ({
      secretaria: sec,
      entraram: v.entraram,
      sairam: v.sairam,
      saldo: v.entraram - v.sairam,
      porTipo: v.porTipo,
    }));
    if (q.trim()) {
      const s = q.trim().toUpperCase();
      arr = arr.filter((r) => r.secretaria.toUpperCase().includes(s));
    }
    arr.sort((a, b) => a.saldo - b.saldo);
    return arr;
  }, [entradas, saidas, q]);

  // Ranking déficit
  const rankingDeficit = useMemo(
    () => bySecretaria.filter((r) => r.saldo < 0).slice(0, 10).map((r) => ({ name: r.secretaria, value: -r.saldo })),
    [bySecretaria],
  );
  const rankingSuperavit = useMemo(
    () => [...bySecretaria].filter((r) => r.saldo > 0).sort((a, b) => b.saldo - a.saldo).slice(0, 10).map((r) => ({ name: r.secretaria, value: r.saldo })),
    [bySecretaria],
  );

  // Monthly evolution
  const monthly = useMemo(() => {
    const map = new Map<string, { mes: string; entradas: number; saidas: number }>();
    const monthKey = (iso: string) => iso.slice(0, 7);
    for (const e of entradas) {
      const k = monthKey(e.data);
      if (!k) continue;
      let v = map.get(k); if (!v) { v = { mes: k, entradas: 0, saidas: 0 }; map.set(k, v); }
      v.entradas++;
    }
    for (const s of saidas) {
      const k = monthKey(s.data);
      if (!k) continue;
      let v = map.get(k); if (!v) { v = { mes: k, entradas: 0, saidas: 0 }; map.set(k, v); }
      v.saidas++;
    }
    return Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [entradas, saidas]);

  // Compare metrics callback
  const compareMetrics = (from: string, to: string): MetricResult[] => {
    const eIn = admissoes.filter((a) => a.data_efetiva && a.data_efetiva >= from && a.data_efetiva <= to).length;
    const eOut = rescisoes.filter((r) => r.data_rescisao >= from && r.data_rescisao <= to);
    const byT = eOut.reduce<Record<string, number>>((a, r) => {
      const t = classSaida(r.motivo_categoria, r.rescisao_descricao);
      a[t] = (a[t] ?? 0) + 1; return a;
    }, {});
    return [
      { label: "Entradas", value: eIn },
      { label: "Saídas", value: eOut.length },
      { label: "Saldo", value: eIn - eOut.length },
      { label: "Exonerações", value: byT["Exoneração"] ?? 0 },
      { label: "Aposentadorias", value: byT["Aposentadoria"] ?? 0 },
      { label: "Vacâncias", value: byT["Vacância"] ?? 0 },
    ];
  };

  // KPI cards
  const kpiCards: Array<{ key: any; title: string; value: number; icon: any; tone: string }> = [
    { key: "entradas", title: "Total admitidos", value: kpi.totalEntradas, icon: <UserPlus />, tone: "text-emerald-600" },
    { key: "saidas", title: "Total desligados", value: kpi.totalSaidas, icon: <UserMinus />, tone: "text-rose-600" },
    { key: null, title: "Saldo líquido", value: kpi.saldo, icon: <Scale />, tone: kpi.saldo >= 0 ? "text-emerald-600" : "text-rose-600" },
    { key: "exoneracoes", title: "Exonerações", value: kpi.exoneracoes, icon: <TrendingDown />, tone: "text-rose-500" },
    { key: "aposentadorias", title: "Aposentadorias", value: kpi.aposentadorias, icon: <Award />, tone: "text-amber-600" },
    { key: "vacancias", title: "Vacâncias", value: kpi.vacancias, icon: <AlertTriangle />, tone: "text-orange-600" },
    { key: "rescisoes", title: "Rescisões", value: kpi.rescisoes, icon: <UserMinus />, tone: "text-rose-500" },
    { key: "falecimentos", title: "Falecimentos", value: kpi.falecimentos, icon: <Activity />, tone: "text-slate-500" },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div className="rounded-lg bg-primary/10 p-2"><Users className="h-5 w-5 text-primary" /></div>
            <div>
              <h1 className="text-base font-semibold leading-tight">Painel Executivo de Movimentação de Pessoal</h1>
              <p className="text-xs text-muted-foreground">Entradas · Saídas · Saldo por Secretaria e Cargo</p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <Link to="/"><Button variant="ghost" size="sm">SGC</Button></Link>
            <Link to="/chamamentos"><Button variant="ghost" size="sm">Chamamentos</Button></Link>
            <Link to="/levantamento"><Button variant="ghost" size="sm">Levantamento</Button></Link>
            <Link to="/rescisoes"><Button variant="ghost" size="sm">Rescisões</Button></Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-4 p-4">
        {/* Filters bar */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-3">
            <GlobalPeriodFilter />
            <div className="mx-1 h-6 w-px bg-border" />
            <Select value={vinculoFilter || "_all"} onValueChange={(v) => setVinculoFilter(v === "_all" ? "" : v)}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Vínculo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos os vínculos</SelectItem>
                <SelectItem value="Estatutário">Estatutário</SelectItem>
                <SelectItem value="Estagiário">Estagiário</SelectItem>
                <SelectItem value="Comissionado">Comissionado</SelectItem>
                <SelectItem value="Celetista/Temporário">Celetista/Temporário</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoSaida || "_all"} onValueChange={(v) => setTipoSaida(v === "_all" ? "" : v)}>
              <SelectTrigger className="h-8 w-52 text-xs"><SelectValue placeholder="Tipo de desligamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Todos os tipos</SelectItem>
                <SelectItem value="Exoneração">Exoneração</SelectItem>
                <SelectItem value="Aposentadoria">Aposentadoria</SelectItem>
                <SelectItem value="Falecimento">Falecimento</SelectItem>
                <SelectItem value="Rescisão">Rescisão</SelectItem>
                <SelectItem value="Vacância">Vacância</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar secretaria…"
                className="h-8 w-56 pl-8 text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Executive KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          {kpiCards.map((k) => (
            <Card
              key={k.title}
              className={k.key ? "cursor-pointer transition hover:border-primary hover:shadow-md" : ""}
              onClick={() => k.key && setDrillKpi(k.key)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.title}</p>
                  <span className={k.tone}>{k.icon}</span>
                </div>
                <p className={`mt-1 text-xl font-semibold tabular-nums ${k.tone}`}>{k.value.toLocaleString("pt-BR")}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Secretarias table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Movimentação por Secretaria</span>
              <span className="text-xs font-normal text-muted-foreground">
                {bySecretaria.length} secretarias · clique para detalhar por cargo
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Secretaria</TableHead>
                    <TableHead className="text-right">Entraram</TableHead>
                    <TableHead className="text-right">Saíram</TableHead>
                    <TableHead className="text-right">Exoner.</TableHead>
                    <TableHead className="text-right">Aposent.</TableHead>
                    <TableHead className="text-right">Vacâncias</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bySecretaria.map((r) => {
                    const tone = r.saldo > 0 ? "🟢" : r.saldo === 0 ? "🟡" : "🔴";
                    const saldoColor = r.saldo > 0 ? "text-emerald-600" : r.saldo < 0 ? "text-rose-600" : "text-amber-600";
                    return (
                      <TableRow
                        key={r.secretaria}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => setDrillSecretaria(r.secretaria)}
                      >
                        <TableCell className="text-lg">{tone}</TableCell>
                        <TableCell className="font-medium">{r.secretaria}</TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600">{r.entraram}</TableCell>
                        <TableCell className="text-right tabular-nums text-rose-600">{r.sairam}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.porTipo["Exoneração"] ?? 0}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.porTipo["Aposentadoria"] ?? 0}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.porTipo["Vacância"] ?? 0}</TableCell>
                        <TableCell className={`text-right font-semibold tabular-nums ${saldoColor}`}>
                          {r.saldo > 0 ? `+${r.saldo}` : r.saldo}
                        </TableCell>
                        <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                      </TableRow>
                    );
                  })}
                  {bySecretaria.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-6 text-center text-sm text-muted-foreground">
                        Nenhuma movimentação no período selecionado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4" /> Evolução mensal — Entradas vs. Saídas
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="mes" fontSize={10} />
                  <YAxis fontSize={10} />
                  <RTooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="entradas" stroke="hsl(142 71% 45%)" strokeWidth={2} name="Entradas" dot={false} />
                  <Line type="monotone" dataKey="saidas" stroke="hsl(0 84% 60%)" strokeWidth={2} name="Saídas" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingDown className="h-4 w-4 text-rose-500" /> Ranking — Maior déficit por secretaria
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankingDeficit} layout="vertical" margin={{ left: 90, right: 12, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" fontSize={10} />
                  <YAxis type="category" dataKey="name" fontSize={10} width={90} />
                  <RTooltip />
                  <Bar
                    dataKey="value"
                    fill="hsl(0 84% 60%)"
                    radius={[0, 4, 4, 0]}
                    onClick={(d: any) => setDrillSecretaria(d?.name)}
                    style={{ cursor: "pointer" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Ranking superavit */}
        {rankingSuperavit.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-emerald-600" /> Ranking — Maior superávit por secretaria
              </CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankingSuperavit} layout="vertical" margin={{ left: 90, right: 12, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" fontSize={10} />
                  <YAxis type="category" dataKey="name" fontSize={10} width={90} />
                  <RTooltip />
                  <Bar
                    dataKey="value"
                    fill="hsl(142 71% 45%)"
                    radius={[0, 4, 4, 0]}
                    onClick={(d: any) => setDrillSecretaria(d?.name)}
                    style={{ cursor: "pointer" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <PeriodComparator compute={compareMetrics} />
      </div>

      {/* Level 1: Cargos of secretaria */}
      <SecretariaDialog
        secretaria={drillSecretaria}
        entradas={entradas}
        saidas={saidas}
        onClose={() => setDrillSecretaria(null)}
        onOpenCargo={(cargo) => setDrillCargo({ secretaria: drillSecretaria!, cargo })}
      />

      {/* Level 2: Cargo detail */}
      <CargoDialog
        target={drillCargo}
        entradas={entradas}
        saidas={saidas}
        onClose={() => setDrillCargo(null)}
        onOpenServidor={(s) => setDrillServidor(s)}
      />

      {/* Level 3: Servidor timeline */}
      <ServidorTimelineWrapper
        target={drillServidor}
        evolucoes={evolucoes}
        admissoes={admissoes}
        rescisoes={rescisoes}
        onClose={() => setDrillServidor(null)}
      />

      {/* KPI drill */}
      <KpiDrillDialog
        kind={drillKpi}
        entradas={entradas}
        saidas={saidas}
        onClose={() => setDrillKpi(null)}
        onOpenServidor={(s) => setDrillServidor(s)}
      />
    </div>
  );
}

/* ================== Level 1 dialog: cargos ================== */

function SecretariaDialog({
  secretaria, entradas, saidas, onClose, onOpenCargo,
}: {
  secretaria: string | null;
  entradas: Entrada[];
  saidas: Saida[];
  onClose: () => void;
  onOpenCargo: (cargo: string) => void;
}) {
  const rows = useMemo(() => {
    if (!secretaria) return [];
    const map = new Map<string, { entraram: number; sairam: number; porTipo: Record<string, number> }>();
    const ensure = (k: string) => {
      let v = map.get(k); if (!v) { v = { entraram: 0, sairam: 0, porTipo: {} }; map.set(k, v); }
      return v;
    };
    for (const e of entradas) if (e.secretaria === secretaria) ensure(e.cargo).entraram++;
    for (const s of saidas) if (s.secretaria === secretaria) {
      const v = ensure(s.cargo); v.sairam++;
      v.porTipo[s.tipo] = (v.porTipo[s.tipo] ?? 0) + 1;
    }
    return Array.from(map.entries())
      .map(([cargo, v]) => ({ cargo, ...v, saldo: v.entraram - v.sairam }))
      .sort((a, b) => a.saldo - b.saldo);
  }, [secretaria, entradas, saidas]);

  const totals = useMemo(() => {
    const e = rows.reduce((a, r) => a + r.entraram, 0);
    const s = rows.reduce((a, r) => a + r.sairam, 0);
    return { entraram: e, sairam: s, saldo: e - s };
  }, [rows]);

  return (
    <Dialog open={!!secretaria} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            {secretaria}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              — Entraram: <span className="text-emerald-600 font-medium">{totals.entraram}</span> ·
              Saíram: <span className="text-rose-600 font-medium">{totals.sairam}</span> ·
              Saldo: <span className={totals.saldo >= 0 ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                {totals.saldo > 0 ? `+${totals.saldo}` : totals.saldo}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1 border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="text-right">Entraram</TableHead>
                <TableHead className="text-right">Saíram</TableHead>
                <TableHead className="text-right">Exoner.</TableHead>
                <TableHead className="text-right">Aposent.</TableHead>
                <TableHead className="text-right">Vac.</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const tone = r.saldo > 0 ? "🟢" : r.saldo === 0 ? "🟡" : "🔴";
                const color = r.saldo > 0 ? "text-emerald-600" : r.saldo < 0 ? "text-rose-600" : "text-amber-600";
                return (
                  <TableRow key={r.cargo} className="cursor-pointer hover:bg-accent/50" onClick={() => onOpenCargo(r.cargo)}>
                    <TableCell className="text-lg">{tone}</TableCell>
                    <TableCell className="text-xs">{r.cargo}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600">{r.entraram}</TableCell>
                    <TableCell className="text-right tabular-nums text-rose-600">{r.sairam}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.porTipo["Exoneração"] ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.porTipo["Aposentadoria"] ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.porTipo["Vacância"] ?? 0}</TableCell>
                    <TableCell className={`text-right font-semibold tabular-nums ${color}`}>
                      {r.saldo > 0 ? `+${r.saldo}` : r.saldo}
                    </TableCell>
                    <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={9} className="py-6 text-center text-xs text-muted-foreground">Sem cargos.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ================== Level 2 dialog: cargo detail ================== */

function CargoDialog({
  target, entradas, saidas, onClose, onOpenServidor,
}: {
  target: { secretaria: string; cargo: string } | null;
  entradas: Entrada[];
  saidas: Saida[];
  onClose: () => void;
  onOpenServidor: (s: { nome: string; matricula: string }) => void;
}) {
  const admitidos = useMemo(
    () => !target ? [] : entradas.filter((e) => e.secretaria === target.secretaria && e.cargo === target.cargo),
    [target, entradas],
  );
  const desligados = useMemo(
    () => !target ? [] : saidas.filter((s) => s.secretaria === target.secretaria && s.cargo === target.cargo),
    [target, saidas],
  );
  const saldo = admitidos.length - desligados.length;

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            {target?.cargo}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{target?.secretaria}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <Metric label="Admitidos" value={admitidos.length} tone="text-emerald-600" />
            <Metric label="Desligados" value={desligados.length} tone="text-rose-600" />
            <Metric label="Exoner." value={desligados.filter((d) => d.tipo === "Exoneração").length} />
            <Metric label="Aposent." value={desligados.filter((d) => d.tipo === "Aposentadoria").length} />
            <Metric label="Vac." value={desligados.filter((d) => d.tipo === "Vacância").length} />
            <Metric label="Saldo" value={saldo} tone={saldo >= 0 ? "text-emerald-600" : "text-rose-600"} />
          </div>
        </DialogHeader>

        <Tabs defaultValue="admitidos" className="flex-1 flex flex-col overflow-hidden">
          <TabsList>
            <TabsTrigger value="admitidos"><UserPlus className="h-3.5 w-3.5 mr-1" /> Admitidos ({admitidos.length})</TabsTrigger>
            <TabsTrigger value="desligados"><UserMinus className="h-3.5 w-3.5 mr-1" /> Desligados ({desligados.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="admitidos" className="flex-1 overflow-auto border rounded-md mt-2">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Prontuário</TableHead>
                  <TableHead>Data admissão</TableHead>
                  <TableHead>Vínculo</TableHead>
                  <TableHead>Concurso/Memo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admitidos.map((e, i) => (
                  <TableRow
                    key={`${e.prontuario}-${i}`}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => onOpenServidor({ nome: e.nome, matricula: e.prontuario })}
                  >
                    <TableCell className="text-xs font-medium">{e.nome}</TableCell>
                    <TableCell className="text-xs">{e.prontuario || "—"}</TableCell>
                    <TableCell className="text-xs">{fmtDate(e.data)}</TableCell>
                    <TableCell className="text-xs">{e.vinculo}</TableCell>
                    <TableCell className="text-xs">{e.concurso ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {admitidos.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-6 text-center text-xs text-muted-foreground">Nenhuma admissão.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="desligados" className="flex-1 overflow-auto border rounded-md mt-2">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Motivo detalhado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {desligados.map((s, i) => (
                  <TableRow
                    key={`${s.matricula}-${i}`}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => onOpenServidor({ nome: s.nome, matricula: s.matricula })}
                  >
                    <TableCell className="text-xs font-medium">{s.nome}</TableCell>
                    <TableCell className="text-xs">{s.matricula || "—"}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[10px]">{s.tipo}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{fmtDate(s.data)}</TableCell>
                    <TableCell className="text-xs">{s.desc}</TableCell>
                  </TableRow>
                ))}
                {desligados.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-6 text-center text-xs text-muted-foreground">Nenhum desligamento.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-2 py-1">
      <span className="text-[10px] uppercase text-muted-foreground">{label} </span>
      <span className={`ml-1 font-semibold tabular-nums ${tone ?? ""}`}>{value}</span>
    </div>
  );
}

/* ================== Level 3: Servidor timeline ================== */

function ServidorTimelineWrapper({
  target, evolucoes, admissoes, rescisoes, onClose,
}: {
  target: { nome: string; matricula: string } | null;
  evolucoes: Evolucao[];
  admissoes: Admissao[];
  rescisoes: Rescisao[];
  onClose: () => void;
}) {
  const events = useMemo<Evolucao[]>(() => {
    if (!target) return [];
    const mat = normPront(target.matricula);
    const nm = normName(target.nome);
    // Match by matricula/prontuario when possible, else name
    const found = evolucoes.filter((e) => {
      const em = normPront(e.matricula);
      if (mat && em && em === mat) return true;
      return normName(e.nome) === nm;
    });
    if (found.length) return found.sort((a, b) => (a.evolucao_data ?? "").localeCompare(b.evolucao_data ?? ""));
    // Fallback: build synthetic events from admissoes/rescisoes
    const synth: Evolucao[] = [];
    admissoes.forEach((a) => {
      const am = normPront(a.prontuario);
      if ((mat && am === mat) || normName(a.nome) === nm) {
        synth.push({
          id: -a.id,
          matricula: a.prontuario ?? "",
          nome: a.nome,
          secretaria_nome: a.secretaria,
          data_admissao: a.data_efetiva,
          data_rescisao: null,
          rescisao_descricao: null,
          cargo_atual_nome: a.cargo,
          vinculo_nome: a.vinculo,
          evolucao_cargo_nome: a.cargo,
          evolucao_data: a.data_efetiva,
          evolucao_fundamento: "Admissão",
          fundamento_categoria: "Admissão",
        });
      }
    });
    rescisoes.forEach((r) => {
      const rm = normPront(r.matricula);
      if ((mat && rm === mat) || normName(r.nome) === nm) {
        synth.push({
          id: -r.id - 1000000,
          matricula: r.matricula ?? "",
          nome: r.nome,
          secretaria_nome: r.secretaria_nome,
          data_admissao: r.data_admissao,
          data_rescisao: r.data_rescisao,
          rescisao_descricao: r.rescisao_descricao,
          cargo_atual_nome: r.cargo_nome,
          vinculo_nome: r.vinculo_nome,
          evolucao_cargo_nome: r.cargo_nome,
          evolucao_data: r.data_rescisao,
          evolucao_fundamento: r.motivo_categoria,
          fundamento_categoria: r.motivo_categoria,
        });
      }
    });
    return synth.sort((a, b) => (a.evolucao_data ?? "").localeCompare(b.evolucao_data ?? ""));
  }, [target, evolucoes, admissoes, rescisoes]);

  if (!target) return null;
  return (
    <JornadaTimeline
      open={!!target}
      onClose={onClose}
      nome={target.nome}
      matricula={target.matricula || "—"}
      eventos={events}
    />
  );
}

/* ================== KPI drill ================== */

function KpiDrillDialog({
  kind, entradas, saidas, onClose, onOpenServidor,
}: {
  kind: null | "entradas" | "saidas" | "vacancias" | "aposentadorias" | "exoneracoes" | "falecimentos" | "rescisoes";
  entradas: Entrada[];
  saidas: Saida[];
  onClose: () => void;
  onOpenServidor: (s: { nome: string; matricula: string }) => void;
}) {
  const list = useMemo(() => {
    if (!kind) return [];
    if (kind === "entradas") return entradas.map((e) => ({
      nome: e.nome, matricula: e.prontuario, secretaria: e.secretaria, cargo: e.cargo,
      motivo: `Admissão · ${e.vinculo}`, data: e.data,
    }));
    const tipoFor: Record<string, SaidaTipo> = {
      exoneracoes: "Exoneração", aposentadorias: "Aposentadoria",
      vacancias: "Vacância", falecimentos: "Falecimento", rescisoes: "Rescisão",
    };
    const t = tipoFor[kind];
    const src = t ? saidas.filter((s) => s.tipo === t) : saidas;
    return src.map((s) => ({
      nome: s.nome, matricula: s.matricula, secretaria: s.secretaria, cargo: s.cargo,
      motivo: `${s.tipo} · ${s.desc}`, data: s.data,
    }));
  }, [kind, entradas, saidas]);

  const titleMap: Record<string, string> = {
    entradas: "Servidores admitidos",
    saidas: "Servidores desligados",
    exoneracoes: "Exonerações",
    aposentadorias: "Aposentadorias",
    vacancias: "Vacâncias",
    falecimentos: "Falecimentos",
    rescisoes: "Rescisões",
  };

  return (
    <Dialog open={!!kind} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">
            {kind ? titleMap[kind] : ""}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              — {list.length.toLocaleString("pt-BR")} registros
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1 border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Secretaria</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.slice(0, 500).map((r, i) => (
                <TableRow
                  key={i}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => onOpenServidor({ nome: r.nome, matricula: r.matricula })}
                >
                  <TableCell className="text-xs font-medium">{r.nome}</TableCell>
                  <TableCell className="text-xs">{r.cargo}</TableCell>
                  <TableCell className="text-xs">{r.secretaria}</TableCell>
                  <TableCell className="text-xs">{r.motivo}</TableCell>
                  <TableCell className="text-xs">{r.matricula || "—"}</TableCell>
                  <TableCell className="text-xs">{fmtDate(r.data)}</TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-6 text-center text-xs text-muted-foreground">Sem registros.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          {list.length > 500 && (
            <p className="p-2 text-center text-[11px] text-muted-foreground">Mostrando primeiros 500 de {list.length.toLocaleString("pt-BR")}. Refine os filtros para reduzir.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}