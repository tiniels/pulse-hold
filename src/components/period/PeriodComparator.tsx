import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, GitCompare } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** A single named metric value with optional formatting helper */
export type MetricResult = {
  label: string;
  value: number;
  /** Optional formatter (default: pt-BR integer). */
  format?: (v: number) => string;
};

/** Compute callback — receives ISO dates (yyyy-mm-dd) and returns metric set. */
export type ComputeMetrics = (fromISO: string, toISO: string) => MetricResult[];

export type ComparePeriod = {
  id: string;
  label: string;
  from: Date;
  to: Date;
};

const PALETTE = [
  "hsl(221 83% 53%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 60%)",
  "hsl(0 84% 60%)",
  "hsl(199 89% 48%)",
  "hsl(160 60% 45%)",
];

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

function fmt(d: Date) {
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

function defaultLabel(d: Date, t: Date, index: number) {
  return `Período ${String.fromCharCode(65 + index)} — ${fmt(d)} → ${fmt(t)}`;
}

/** Try to suggest a sensible second period when user adds one */
function suggestNext(prev: ComparePeriod | undefined): { from: Date; to: Date } {
  if (!prev) {
    const now = new Date();
    return { from: new Date(now.getFullYear(), 0, 1), to: now };
  }
  const days = daysBetween(prev.from, prev.to);
  const to = new Date(prev.from.getTime() - 86400000);
  const from = new Date(to.getTime() - (days - 1) * 86400000);
  return { from, to };
}

function defaultInitial(): ComparePeriod[] {
  const now = new Date();
  const aFrom = new Date(now.getFullYear(), 0, 1);
  const aTo = now;
  const days = daysBetween(aFrom, aTo);
  const bTo = new Date(aFrom.getTime() - 86400000);
  const bFrom = new Date(bTo.getTime() - (days - 1) * 86400000);
  return [
    { id: crypto.randomUUID(), label: "Período A", from: aFrom, to: aTo },
    { id: crypto.randomUUID(), label: "Período B", from: bFrom, to: bTo },
  ];
}

function PeriodPicker({
  value, onChange,
}: {
  value: { from: Date; to: Date };
  onChange: (v: { from: Date; to: Date }) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-normal">
          <CalendarIcon className="h-3.5 w-3.5" />
          {fmt(value.from)} → {fmt(value.to)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <Calendar
          mode="range"
          locale={ptBR}
          numberOfMonths={2}
          selected={{ from: value.from, to: value.to }}
          onSelect={(r) => {
            if (r?.from && r.to) onChange({ from: r.from, to: r.to });
          }}
          className={cn("pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Análise Comparativa de Períodos — genérica.
 * Cada página passa um `compute(from, to)` que devolve as métricas que importam
 * àquela página, e o comparador roda a função uma vez por período.
 */
export function PeriodComparator({
  compute, title = "Análise Comparativa de Períodos",
  className,
}: {
  compute: ComputeMetrics;
  title?: string;
  className?: string;
}) {
  const [periods, setPeriods] = useState<ComparePeriod[]>(() => defaultInitial());

  const rows = useMemo(() => {
    return periods.map((p, i) => {
      const days = daysBetween(p.from, p.to);
      const metrics = compute(toISO(p.from), toISO(p.to));
      return {
        ...p,
        index: i,
        days,
        color: PALETTE[i % PALETTE.length],
        metrics,
      };
    });
  }, [periods, compute]);

  // build chart data: one bar group per metric, one bar per period
  const chartData = useMemo(() => {
    const labels = new Set<string>();
    rows.forEach((r) => r.metrics.forEach((m) => labels.add(m.label)));
    return Array.from(labels).map((label) => {
      const row: Record<string, number | string> = { metric: label };
      rows.forEach((r, i) => {
        const m = r.metrics.find((x) => x.label === label);
        row[r.label || `P${i + 1}`] = m?.value ?? 0;
      });
      return row;
    });
  }, [rows]);

  // detect mixed durations for normalization note
  const mixedDurations = useMemo(() => {
    if (rows.length < 2) return false;
    return rows.some((r) => r.days !== rows[0].days);
  }, [rows]);

  function addPeriod() {
    const last = periods[periods.length - 1];
    const next = suggestNext(last);
    setPeriods((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: defaultLabel(next.from, next.to, prev.length),
        from: next.from,
        to: next.to,
      },
    ]);
  }

  function removePeriod(id: string) {
    setPeriods((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.id !== id)));
  }

  function updatePeriod(id: string, patch: Partial<ComparePeriod>) {
    setPeriods((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function defaultFmt(n: number) {
    return n.toLocaleString("pt-BR");
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Compare métricas em múltiplos intervalos. As métricas são calculadas individualmente para cada período;
          quando as durações forem diferentes, exibimos também a média diária para comparação proporcional.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Períodos */}
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2 bg-muted/20">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: r.color }}
                aria-hidden
              />
              <input
                className="h-7 rounded border bg-background px-2 text-xs w-36"
                value={r.label}
                onChange={(e) => updatePeriod(r.id, { label: e.target.value })}
                aria-label={`Nome do período ${i + 1}`}
              />
              <PeriodPicker
                value={{ from: r.from, to: r.to }}
                onChange={(v) => updatePeriod(r.id, { from: v.from, to: v.to })}
              />
              <span className="text-[10px] text-muted-foreground">{r.days} dias</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 ml-auto"
                aria-label="Remover período"
                disabled={rows.length <= 1}
                onClick={() => removePeriod(r.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={addPeriod}>
            <Plus className="h-3.5 w-3.5" /> Adicionar Período
          </Button>
          {mixedDurations ? (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              ⚠ Períodos com durações diferentes: as comparações absolutas podem não ser justas. Considere também a média diária exibida abaixo.
            </p>
          ) : null}
        </div>

        {/* Tabela de KPIs */}
        {rows[0]?.metrics.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Métrica</th>
                  {rows.map((r) => (
                    <th key={r.id} className="text-right py-1.5 px-2 font-medium" style={{ color: r.color }}>
                      {r.label}
                    </th>
                  ))}
                  {rows.length >= 2 ? (
                    <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">Δ vs. {rows[0].label}</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows[0].metrics.map((m0) => {
                  const baseline = m0.value;
                  return (
                    <tr key={m0.label} className="border-b last:border-0">
                      <td className="py-1.5 px-2 font-medium">{m0.label}</td>
                      {rows.map((r) => {
                        const m = r.metrics.find((x) => x.label === m0.label);
                        const v = m?.value ?? 0;
                        const f = m?.format ?? defaultFmt;
                        const perDay = r.days ? v / r.days : 0;
                        return (
                          <td key={r.id} className="text-right py-1.5 px-2 tabular-nums">
                            <div>{f(v)}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {perDay.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} /dia
                            </div>
                          </td>
                        );
                      })}
                      {rows.length >= 2 ? (
                        <td className="text-right py-1.5 px-2 tabular-nums">
                          {rows.slice(1).map((r) => {
                            const m = r.metrics.find((x) => x.label === m0.label);
                            const v = m?.value ?? 0;
                            const delta = v - baseline;
                            const pct = baseline === 0 ? null : (delta / baseline) * 100;
                            const sign = delta > 0 ? "+" : "";
                            const color =
                              delta > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : delta < 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-muted-foreground";
                            return (
                              <div key={r.id} className={cn("text-[11px]", color)}>
                                {r.label}: {sign}{delta.toLocaleString("pt-BR")}
                                {pct !== null ? ` (${sign}${pct.toFixed(1)}%)` : ""}
                              </div>
                            );
                          })}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Sem métricas para esta página.</p>
        )}

        {/* Gráfico */}
        {chartData.length ? (
          <div className="h-64 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="metric" fontSize={10} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis fontSize={10} />
                <RTooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {rows.map((r, i) => (
                  <Bar
                    key={r.id}
                    dataKey={r.label || `P${i + 1}`}
                    fill={r.color}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}