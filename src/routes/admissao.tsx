import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  listDimensoesCanonicas,
  listMovimentacoesCanonicas,
  listCoberturaMDM,
  type EntradaCanonica,
  type SaidaCanonica,
  type PainelDims,
} from "@/lib/painel-canonico.functions";
import { LoginGate } from "@/components/rescisoes/LoginGate";
import { GlobalPeriodFilter } from "@/components/period/GlobalPeriodFilter";
import { PeriodComparator, type MetricResult } from "@/components/period/PeriodComparator";
import { usePeriod } from "@/contexts/PeriodContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, LineChart, Line,
} from "recharts";
import {
  ArrowLeft, Building2, Users, UserPlus, UserMinus,
  TrendingUp, TrendingDown, Scale, Activity, Award, AlertTriangle,
} from "lucide-react";
import { HierarquiaMovimentacao } from "@/components/painel/HierarquiaMovimentacao";
import { CoberturaMDMCard } from "@/components/painel/CoberturaMDMCard";
import { AuditoriaDialog } from "@/components/painel/AuditoriaDialog";

/* ================== route ================== */

const dimsQuery = queryOptions({
  queryKey: ["painel", "dims"],
  queryFn: () => listDimensoesCanonicas(),
});

export const Route = createFileRoute("/admissao")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Movimentação de Pessoal | Painel Executivo Canônico — DP CAB" },
      { name: "description", content: "Painel Executivo consumindo exclusivamente a Base Canônica (MDM): Secretaria → Grupo de Cargo → Especialidade → Servidor." },
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

function AdmissaoPage() {
  const { fromISO, toISO } = usePeriod();
  const { data: dims } = useSuspenseQuery(dimsQuery);

  const callMov = useServerFn(listMovimentacoesCanonicas);
  const callCob = useServerFn(listCoberturaMDM);

  const movQuery = useSuspenseQuery(
    queryOptions({
      queryKey: ["painel", "mov", fromISO, toISO],
      queryFn: () => callMov({ data: { fromISO, toISO } }),
    }),
  );
  const cobQuery = useSuspenseQuery(
    queryOptions({
      queryKey: ["painel", "cobertura", fromISO, toISO],
      queryFn: () => callCob({ data: { fromISO, toISO } }),
    }),
  );

  const { entradas: entradasAll, saidas: saidasAll } = movQuery.data;
  const cobertura = cobQuery.data;

  // Filtros canônicos
  const [secretariaFilter, setSecretariaFilter] = useState<string>("");
  const [grupoCargoFilter, setGrupoCargoFilter] = useState<string>("");
  const [especialidadeFilter, setEspecialidadeFilter] = useState<string>("");
  const [vinculoFilter, setVinculoFilter] = useState<string>("");
  const [motivoFilter, setMotivoFilter] = useState<string>("");

  const [audit, setAudit] = useState<null | { nivel: "secretaria" | "grupo_cargo"; id: string; label: string }>(null);

  const applyFilters = <T extends EntradaCanonica>(rows: T[], isSaida: boolean): T[] => {
    return rows.filter((r) => {
      if (secretariaFilter && r.secretaria_id !== secretariaFilter) return false;
      if (grupoCargoFilter && r.grupo_cargo_id !== grupoCargoFilter) return false;
      if (especialidadeFilter && r.especialidade_id !== especialidadeFilter) return false;
      if (vinculoFilter && r.vinculo_id !== vinculoFilter) return false;
      if (motivoFilter && (!isSaida || (r as unknown as SaidaCanonica).motivo_id !== motivoFilter)) return false;
      return true;
    });
  };

  const entradas = useMemo(() => applyFilters(entradasAll, false), [entradasAll, secretariaFilter, grupoCargoFilter, especialidadeFilter, vinculoFilter, motivoFilter]);
  const saidas = useMemo(() => applyFilters(saidasAll, true), [saidasAll, secretariaFilter, grupoCargoFilter, especialidadeFilter, vinculoFilter, motivoFilter]);

  const kpi = useMemo(() => {
    const t = { entradas: entradas.length, saidas: saidas.length, exon: 0, apos: 0, vac: 0, fale: 0, resc: 0 };
    for (const s of saidas) {
      if (s.saida_categoria === "Exoneração") t.exon++;
      else if (s.saida_categoria === "Aposentadoria") t.apos++;
      else if (s.saida_categoria === "Vacância") t.vac++;
      else if (s.saida_categoria === "Falecimento") t.fale++;
      else if (s.saida_categoria === "Rescisão" || s.saida_categoria === "Demissão") t.resc++;
    }
    return { ...t, saldo: t.entradas - t.saidas };
  }, [entradas, saidas]);

  // Ranking por secretaria canônica
  const rankSecretarias = useMemo(() => {
    const secNome = new Map(dims.secretarias.map((s) => [s.id, s.nome]));
    const map = new Map<string, { entradas: number; saidas: number }>();
    const ensure = (k: string) => {
      let v = map.get(k); if (!v) { v = { entradas: 0, saidas: 0 }; map.set(k, v); }
      return v;
    };
    for (const e of entradas) if (e.secretaria_id) ensure(e.secretaria_id).entradas++;
    for (const s of saidas) if (s.secretaria_id) ensure(s.secretaria_id).saidas++;
    return Array.from(map.entries()).map(([id, v]) => ({
      id,
      nome: secNome.get(id) ?? "—",
      entradas: v.entradas,
      saidas: v.saidas,
      saldo: v.entradas - v.saidas,
    }));
  }, [entradas, saidas, dims]);

  const rankingDeficit = useMemo(
    () => rankSecretarias.filter((r) => r.saldo < 0).sort((a, b) => a.saldo - b.saldo).slice(0, 10).map((r) => ({ name: r.nome, value: -r.saldo })),
    [rankSecretarias],
  );
  const rankingSuperavit = useMemo(
    () => rankSecretarias.filter((r) => r.saldo > 0).sort((a, b) => b.saldo - a.saldo).slice(0, 10).map((r) => ({ name: r.nome, value: r.saldo })),
    [rankSecretarias],
  );

  // Evolução mensal empilhada por top 6 secretarias
  const monthly = useMemo(() => {
    const secNome = new Map(dims.secretarias.map((s) => [s.id, s.nome]));
    const topSecs = [...rankSecretarias]
      .sort((a, b) => (b.entradas + b.saidas) - (a.entradas + a.saidas))
      .slice(0, 6)
      .map((r) => r.id);
    const topSet = new Set(topSecs);
    const monthKey = (iso: string) => iso.slice(0, 7);
    const map = new Map<string, Record<string, number>>();
    const push = (k: string, sec: string | null, delta: number) => {
      let m = map.get(k); if (!m) { m = {}; map.set(k, m); }
      const bucket = sec && topSet.has(sec) ? (secNome.get(sec) ?? "Outras") : "Outras";
      m[bucket] = (m[bucket] ?? 0) + delta;
    };
    for (const e of entradas) if (e.data) push(monthKey(e.data), e.secretaria_id, 1);
    for (const s of saidas) if (s.data) push(monthKey(s.data), s.secretaria_id, -1);
    const cols = ["Outras", ...topSecs.map((id) => secNome.get(id) ?? "—")];
    const rows = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, vals]) => {
        const r: Record<string, string | number> = { mes };
        for (const c of cols) r[c] = vals[c] ?? 0;
        return r;
      });
    return { rows, cols };
  }, [entradas, saidas, dims, rankSecretarias]);

  const compareMetrics = async (from: string, to: string): Promise<MetricResult[]> => {
    const { entradas: eIn, saidas: eOut } = await callMov({ data: { fromISO: from, toISO: to } });
    const filt = <T extends EntradaCanonica>(rows: T[]) => rows.filter((r) => !secretariaFilter || r.secretaria_id === secretariaFilter);
    const en = filt(eIn);
    const sa = filt(eOut);
    const bucket = (c: string) => sa.filter((s) => (s as SaidaCanonica).saida_categoria === c).length;
    return [
      { label: "Entradas", value: en.length },
      { label: "Saídas", value: sa.length },
      { label: "Saldo", value: en.length - sa.length },
      { label: "Exonerações", value: bucket("Exoneração") },
      { label: "Aposentadorias", value: bucket("Aposentadoria") },
      { label: "Vacâncias", value: bucket("Vacância") },
    ];
  };

  const kpiCards = [
    { title: "Total admitidos", value: kpi.entradas, icon: <UserPlus />, tone: "text-emerald-600" },
    { title: "Total desligados", value: kpi.saidas, icon: <UserMinus />, tone: "text-rose-600" },
    { title: "Saldo líquido", value: kpi.saldo, icon: <Scale />, tone: kpi.saldo >= 0 ? "text-emerald-600" : "text-rose-600" },
    { title: "Exonerações", value: kpi.exon, icon: <TrendingDown />, tone: "text-rose-500" },
    { title: "Aposentadorias", value: kpi.apos, icon: <Award />, tone: "text-amber-600" },
    { title: "Vacâncias", value: kpi.vac, icon: <AlertTriangle />, tone: "text-orange-600" },
    { title: "Rescisões", value: kpi.resc, icon: <UserMinus />, tone: "text-rose-500" },
    { title: "Falecimentos", value: kpi.fale, icon: <Activity />, tone: "text-slate-500" },
  ];

  const especialidadesDoGrupo = grupoCargoFilter
    ? dims.especialidades.filter((e) => e.parent_id === grupoCargoFilter)
    : dims.especialidades;

  const stroke = ["#0ea5e9", "#a855f7", "#f59e0b", "#22c55e", "#ef4444", "#14b8a6", "#94a3b8"];

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
              <h1 className="text-base font-semibold leading-tight">Painel Executivo · Base Canônica (MDM)</h1>
              <p className="text-xs text-muted-foreground">Secretaria → Grupo de Cargo → Especialidade → Servidor</p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <Link to="/"><Button variant="ghost" size="sm">SGC</Button></Link>
            <Link to="/chamamentos"><Button variant="ghost" size="sm">Chamamentos</Button></Link>
            <Link to="/levantamento"><Button variant="ghost" size="sm">Levantamento</Button></Link>
            <Link to="/rescisoes"><Button variant="ghost" size="sm">Rescisões</Button></Link>
            <Link to="/mdm"><Button variant="outline" size="sm">MDM</Button></Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-4 p-4">
        {/* Filters */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 p-3">
            <GlobalPeriodFilter />
            <div className="mx-1 h-6 w-px bg-border" />
            <CanonicalSelect
              value={secretariaFilter}
              onChange={setSecretariaFilter}
              placeholder="Secretaria canônica"
              options={dims.secretarias}
              width="w-56"
            />
            <CanonicalSelect
              value={grupoCargoFilter}
              onChange={(v) => { setGrupoCargoFilter(v); setEspecialidadeFilter(""); }}
              placeholder="Grupo de cargo"
              options={dims.grupos_cargo}
              width="w-52"
            />
            <CanonicalSelect
              value={especialidadeFilter}
              onChange={setEspecialidadeFilter}
              placeholder="Especialidade"
              options={especialidadesDoGrupo}
              width="w-48"
              disabled={!grupoCargoFilter && dims.especialidades.length > 200}
            />
            <CanonicalSelect
              value={vinculoFilter}
              onChange={setVinculoFilter}
              placeholder="Vínculo"
              options={dims.vinculos}
              width="w-40"
            />
            <CanonicalSelect
              value={motivoFilter}
              onChange={setMotivoFilter}
              placeholder="Motivo"
              options={dims.motivos}
              width="w-44"
            />
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          {kpiCards.map((k) => (
            <Card key={k.title}>
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

        {/* Hierarchy + Cobertura */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Movimentação canônica hierárquica</span>
                  <span className="text-xs font-normal text-muted-foreground">Clique para expandir · ícone Info abre auditoria</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HierarquiaMovimentacao
                  entradas={entradas}
                  saidas={saidas}
                  dims={dims}
                  onOpenAudit={(nivel, id, label) => setAudit({ nivel, id, label })}
                />
              </CardContent>
            </Card>
          </div>
          <div>
            <CoberturaMDMCard data={cobertura} />
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4" /> Evolução mensal por Secretaria Canônica
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly.rows} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="mes" fontSize={10} />
                  <YAxis fontSize={10} />
                  <RTooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {monthly.cols.map((c, i) => (
                    <Line key={c} type="monotone" dataKey={c} stroke={stroke[i % stroke.length]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingDown className="h-4 w-4 text-rose-500" /> Ranking · Maior déficit (Secretarias Canônicas)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankingDeficit} layout="vertical" margin={{ left: 120, right: 12, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" fontSize={10} />
                  <YAxis type="category" dataKey="name" fontSize={10} width={120} />
                  <RTooltip />
                  <Bar dataKey="value" fill="hsl(0 84% 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {rankingSuperavit.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-emerald-600" /> Ranking · Maior superávit (Secretarias Canônicas)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankingSuperavit} layout="vertical" margin={{ left: 120, right: 12, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" fontSize={10} />
                  <YAxis type="category" dataKey="name" fontSize={10} width={120} />
                  <RTooltip />
                  <Bar dataKey="value" fill="hsl(142 71% 45%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <PeriodComparator compute={compareMetrics} />
      </div>

      <AuditoriaDialog
        open={!!audit}
        onClose={() => setAudit(null)}
        nivel={audit?.nivel ?? "secretaria"}
        id={audit?.id ?? null}
        labelCanonico={audit?.label ?? ""}
      />
    </div>
  );
}

function CanonicalSelect({
  value, onChange, placeholder, options, width, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: Array<{ id: string; nome: string }>;
  width: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value || "_all"} onValueChange={(v) => onChange(v === "_all" ? "" : v)} disabled={disabled}>
      <SelectTrigger className={`h-8 ${width} text-xs`}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent className="max-h-[320px]">
        <SelectItem value="_all">Todos · {placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}