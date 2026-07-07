import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, ExternalLink, AlertTriangle } from "lucide-react";
import type { CoberturaMDM } from "@/lib/painel-canonico.functions";

export function CoberturaMDMCard({ data }: { data: CoberturaMDM }) {
  const pendentes = data.totalPendentes;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Cobertura da Normalização (MDM)
          </span>
          {pendentes > 0 && (
            <Link to="/mdm">
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir MDM
              </Button>
            </Link>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {data.totalClassificados.toLocaleString("pt-BR")} de{" "}
              {data.totalRegistros.toLocaleString("pt-BR")} registros classificados
            </span>
            <span className="font-semibold tabular-nums">{data.pctGlobal.toFixed(1)}%</span>
          </div>
          <Progress value={data.pctGlobal} className="mt-1 h-2" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {data.porTipo.map((t) => (
            <div key={t.tipo} className="rounded-md border bg-muted/30 p-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase text-muted-foreground">{t.label}</p>
                <p className={`text-xs font-semibold tabular-nums ${t.pct >= 95 ? "text-emerald-600" : t.pct >= 80 ? "text-amber-600" : "text-rose-600"}`}>
                  {t.pct.toFixed(0)}%
                </p>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t.classificados.toLocaleString("pt-BR")} classificados ·{" "}
                <span className={t.pendentes > 0 ? "text-rose-600 font-medium" : ""}>
                  {t.pendentes.toLocaleString("pt-BR")} pendentes
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                {t.aliases_utilizados} aliases usados · {t.aliases_pendentes} a revisar
              </p>
            </div>
          ))}
        </div>

        {pendentes > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Existem <strong>{pendentes.toLocaleString("pt-BR")}</strong> registros sem
              classificação canônica. Abra o MDM para resolver os aliases pendentes.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}