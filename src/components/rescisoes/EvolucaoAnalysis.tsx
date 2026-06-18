import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  LineChart, Line, Legend,
} from "recharts";
import { TrendingUp, AlertTriangle, Layers, Clock, ChevronRight } from "lucide-react";
import type { Aggregated } from "@/lib/rescisao-aggregate";
import { ServidoresListDialog } from "./ServidoresListDialog";

const MOTIVO_COLORS: Record<string, string> = {
  "Pedido de Demissão": "hsl(217 91% 60%)",
  "Aposentadoria": "hsl(142 71% 45%)",
  "Falecimento": "hsl(0 0% 45%)",
  "Fim de Contrato": "hsl(38 92% 50%)",
  "Justa Causa": "hsl(0 84% 60%)",
  "Sem Justa Causa": "hsl(280 65% 60%)",
  "Outros": "hsl(210 10% 60%)",
};

export function EvolucaoAnalysis({ aggregated }: { aggregated: Aggregated[] }) {
  const [modal, setModal] = useState<{ title: string; rows: Aggregated[] } | null>(null);

  const stats = useMemo(() => {
    const evolvedBefore = aggregated.filter((a) => a.hasEvolucao);
    const total = aggregated.length;

    // Turnover pós-promoção — só pedidos de demissão
    const pedidos = aggregated.filter((a) => a.motivo_categoria === "Pedido de Demissão" && a.diasUltimaEvolAteRescisao !== null);
    const pedidos6mRows = pedidos.filter((a) => (a.diasUltimaEvolAteRescisao ?? 9e9) <= 182);
    const pedidos12mRows = pedidos.filter((a) => (a.diasUltimaEvolAteRescisao ?? 9e9) <= 365);

    // Reestruturação
    const reestrut = aggregated.filter((a) => a.fundamentosUnicos.has("Reestruturação Administrativa"));
    const reestrutQuickExit = reestrut.filter((a) => (a.diasUltimaEvolAteRescisao ?? 9e9) <= 365);
    const semEvolucao = aggregated.filter((a) => !a.hasEvolucao);

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

    // Linhas múltiplas: tempo de casa (em anos, bucket inteiro) × motivos
    const motivosPresentes = new Set<string>();
    const byBucket = new Map<number, Record<string, number>>();
    for (const a of aggregated) {
      if (a.diasTotaisCasa === null) continue;
      const years = Math.min(30, Math.floor(a.diasTotaisCasa / 365.25));
      motivosPresentes.add(a.motivo_categoria);
      const row = byBucket.get(years) ?? {};
      row[a.motivo_categoria] = (row[a.motivo_categoria] ?? 0) + 1;
      byBucket.set(years, row);
    }
    const maxY = Math.max(0, ...byBucket.keys());
    const lineRows = Array.from({ length: maxY + 1 }, (_, y) => {
      const r: any = { ano: y };
      const row = byBucket.get(y) ?? {};
      for (const m of motivosPresentes) r[m] = row[m] ?? 0;
      return r;
    });

    return {
      total,
      evolvedBefore,
      semEvolucao,
      pedidos6mRows, pedidos12mRows,
      reestrut, reestrutQuickExit,
      fundamentos: fundamentos.slice(0, 12),
      lineRows,
      motivosPresentes: [...motivosPresentes],
    };
  }, [aggregated]);

  const openModal = (title: string, rows: Aggregated[]) => setModal({ title, rows });

  const fundamentoRows = (name: string) =>
    aggregated.filter((a) => a.fundamentosUnicos.has(name));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="Evoluíram antes de sair"
          value={stats.evolvedBefore.length}
          sub={`${stats.total ? ((stats.evolvedBefore.length / stats.total) * 100).toFixed(1) : 0}% dos servidores`}
          onClick={() => openModal("Evoluíram antes de sair", stats.evolvedBefore)}
        />
        <Kpi
          icon={<Clock className="h-4 w-4" />}
          label="Pediram demissão em ≤6m após promoção"
          value={stats.pedidos6mRows.length}
          sub={`${stats.pedidos12mRows.length} em ≤12m (clique p/ ≤6m)`}
          tone="warn"
          onClick={() => openModal("Pediram demissão em ≤6m após promoção", stats.pedidos6mRows)}
        />
        <Kpi
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Saíram após Reestruturação ≤12m"
          value={stats.reestrutQuickExit.length}
          sub={`de ${stats.reestrut.length} c/ reestruturação`}
          tone="danger"
          onClick={() => openModal("Saíram após Reestruturação ≤12m", stats.reestrutQuickExit)}
        />
        <Kpi
          icon={<Layers className="h-4 w-4" />}
          label="Saíram sem nenhuma evolução"
          value={stats.semEvolucao.length}
          sub={`${stats.total ? ((stats.semEvolucao.length / stats.total) * 100).toFixed(1) : 0}% dos servidores`}
          onClick={() => openModal("Saíram sem nenhuma evolução", stats.semEvolucao)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fundamento Legal das Evoluções</CardTitle>
            <p className="text-xs text-muted-foreground">Clique numa barra para ver os servidores</p>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.fundamentos}
                  layout="vertical"
                  margin={{ left: 10, right: 20 }}
                  onClick={(s: any) => {
                    const name = s?.activePayload?.[0]?.payload?.name;
                    if (name) openModal(`Fundamento: ${name}`, fundamentoRows(name));
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={170} />
                  <RTooltip />
                  <Bar dataKey="value" fill="hsl(217 91% 60%)" radius={[0, 4, 4, 0]} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tempo de Casa × Motivo da Saída</CardTitle>
            <p className="text-xs text-muted-foreground">Quantidade de servidores por ano de permanência, segmentada por motivo</p>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.lineRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="ano" tick={{ fontSize: 11 }} label={{ value: "Anos de casa", position: "insideBottom", offset: -2, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RTooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {stats.motivosPresentes.map((m) => (
                    <Line
                      key={m}
                      type="monotone"
                      dataKey={m}
                      stroke={MOTIVO_COLORS[m] ?? "hsl(210 10% 60%)"}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {modal && (
        <ServidoresListDialog
          open
          onClose={() => setModal(null)}
          title={modal.title}
          rows={modal.rows}
        />
      )}
    </div>
  );
}

function Kpi({ icon, label, value, sub, tone, onClick }: {
  icon: React.ReactNode; label: string; value: number; sub: string; tone?: "warn" | "danger"; onClick?: () => void;
}) {
  const toneCls =
    tone === "danger" ? "text-destructive" :
    tone === "warn" ? "text-amber-600" : "text-foreground";
  return (
    <Card
      onClick={onClick}
      className={onClick ? "cursor-pointer transition-all hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5" : ""}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between gap-1.5">
          <span className="flex items-center gap-1.5">{icon} {label}</span>
          {onClick && <ChevronRight className="h-3.5 w-3.5 opacity-50" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${toneCls}`}>{value.toLocaleString("pt-BR")}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}