import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ScatterChart, Scatter, ZAxis, Cell,
} from "recharts";
import { TrendingUp, AlertTriangle, Layers, Clock } from "lucide-react";
import type { Aggregated } from "@/lib/rescisao-aggregate";

export function EvolucaoAnalysis({ aggregated }: { aggregated: Aggregated[] }) {
  const stats = useMemo(() => {
    const evolvedBefore = aggregated.filter((a) => a.hasEvolucao);
    const total = aggregated.length;

    // Turnover pós-promoção — só pedidos de demissão
    const pedidos = aggregated.filter((a) => a.motivo_categoria === "Pedido de Demissão" && a.diasUltimaEvolAteRescisao !== null);
    const pedidos6m = pedidos.filter((a) => (a.diasUltimaEvolAteRescisao ?? 9e9) <= 182).length;
    const pedidos12m = pedidos.filter((a) => (a.diasUltimaEvolAteRescisao ?? 9e9) <= 365).length;

    // Reestruturação
    const reestrut = aggregated.filter((a) => a.fundamentosUnicos.has("Reestruturação Administrativa"));
    const reestrutQuickExit = reestrut.filter((a) => (a.diasUltimaEvolAteRescisao ?? 9e9) <= 365).length;

    // Fundamento legal: count of fundamentos (sem admissão) por categoria
    const fundCat = new Map<string, number>();
    for (const a of aggregated) {
      for (const f of a.fundamentosUnicos) {
        if (f === "Admissão") continue;
        fundCat.set(f, (fundCat.get(f) ?? 0) + 1);
      }
    }
    const fundamentos = [...fundCat.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Scatter
    const colorByMotivo: Record<string, string> = {
      "Pedido de Demissão": "hsl(217 91% 60%)",
      "Aposentadoria": "hsl(142 71% 45%)",
      "Falecimento": "hsl(0 0% 45%)",
      "Fim de Contrato": "hsl(38 92% 50%)",
      "Justa Causa": "hsl(0 84% 60%)",
      "Sem Justa Causa": "hsl(280 65% 60%)",
      "Outros": "hsl(210 10% 60%)",
    };
    const scatter = aggregated
      .filter((a) => a.diasTotaisCasa !== null)
      .map((a) => ({
        x: Math.round((a.diasTotaisCasa ?? 0) / 365.25 * 10) / 10,
        y: a.diasUltimaEvolAteRescisao !== null
          ? Math.round(a.diasUltimaEvolAteRescisao / 365.25 * 10) / 10
          : null,
        nome: a.nome,
        motivo: a.motivo_categoria,
        fill: colorByMotivo[a.motivo_categoria] ?? "hsl(210 10% 60%)",
      }))
      .filter((p) => p.y !== null);

    return {
      total,
      evolvedBefore: evolvedBefore.length,
      pedidos6m, pedidos12m,
      reestrutTotal: reestrut.length,
      reestrutQuickExit,
      fundamentos: fundamentos.slice(0, 12),
      scatter,
    };
  }, [aggregated]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="Evoluíram antes de sair"
          value={stats.evolvedBefore}
          sub={`${stats.total ? ((stats.evolvedBefore / stats.total) * 100).toFixed(1) : 0}% dos servidores`}
        />
        <Kpi
          icon={<Clock className="h-4 w-4" />}
          label="Pediram demissão em ≤6m após promoção"
          value={stats.pedidos6m}
          sub={`${stats.pedidos12m} em ≤12m`}
          tone="warn"
        />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Saíram após Reestruturação ≤12m"
          value={stats.reestrutQuickExit}
          sub={`de ${stats.reestrutTotal} c/ reestruturação`}
          tone="danger"
        />
        <Kpi
          icon={<Layers className="h-4 w-4" />}
          label="Saíram sem nenhuma evolução"
          value={stats.total - stats.evolvedBefore}
          sub={`${stats.total ? (((stats.total - stats.evolvedBefore) / stats.total) * 100).toFixed(1) : 0}% dos servidores`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fundamento Legal das Evoluções</CardTitle>
            <p className="text-xs text-muted-foreground">Categorias mais comuns entre quem foi rescindido</p>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.fundamentos} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={170} />
                  <RTooltip />
                  <Bar dataKey="value" fill="hsl(217 91% 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tempo de Casa × Tempo sem Evolução</CardTitle>
            <p className="text-xs text-muted-foreground">Cada ponto é um servidor; cor = motivo da saída</p>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" dataKey="x" name="Tempo de casa" unit="a" tick={{ fontSize: 11 }} />
                  <YAxis type="number" dataKey="y" name="Sem evolução" unit="a" tick={{ fontSize: 11 }} />
                  <ZAxis range={[40, 40]} />
                  <RTooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    formatter={(v: any, n: any) => [v, n]}
                    labelFormatter={() => ""}
                    content={({ payload }) => {
                      if (!payload || !payload.length) return null;
                      const p = payload[0].payload as any;
                      return (
                        <div className="rounded-md border bg-background p-2 text-xs shadow">
                          <div className="font-medium truncate max-w-[220px]">{p.nome}</div>
                          <div className="text-muted-foreground">{p.motivo}</div>
                          <div>Tempo de casa: {p.x} anos</div>
                          <div>Sem evolução: {p.y} anos</div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={stats.scatter}>
                    {stats.scatter.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub, tone }: {
  icon: React.ReactNode; label: string; value: number; sub: string; tone?: "warn" | "danger";
}) {
  const toneCls =
    tone === "danger" ? "text-destructive" :
    tone === "warn" ? "text-amber-600" : "text-foreground";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          {icon} {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${toneCls}`}>{value.toLocaleString("pt-BR")}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}