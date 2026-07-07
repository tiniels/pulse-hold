import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAuditoriaAgregacao } from "@/lib/painel-canonico.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Layers } from "lucide-react";

type Nivel = "secretaria" | "grupo_cargo" | "vinculo" | "motivo";

export function AuditoriaDialog({
  open,
  onClose,
  nivel,
  id,
  labelCanonico,
}: {
  open: boolean;
  onClose: () => void;
  nivel: Nivel;
  id: string | null;
  labelCanonico: string;
}) {
  const call = useServerFn(listAuditoriaAgregacao);
  const { data, isLoading, error } = useQuery({
    queryKey: ["painel", "auditoria", nivel, id],
    queryFn: () => call({ data: { nivel, id: id! } }),
    enabled: open && !!id,
  });

  const totalRegs = (data?.total_classificados ?? 0) + (data?.total_pendentes_no_tipo ?? 0);
  const pct = totalRegs ? ((data?.total_classificados ?? 0) / totalRegs) * 100 : 100;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Auditoria da normalização — {labelCanonico}
          </DialogTitle>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground p-4">Carregando…</p>}
        {error && <p className="text-sm text-destructive p-4">{(error as Error).message}</p>}

        {data && (
          <div className="space-y-3 overflow-auto">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Metric label="Aliases vinculados" value={data.aliases.length} />
              <Metric label="Classificados neste canônico" value={data.total_classificados} tone="text-emerald-600" />
              <Metric label="Não classificados (tipo)" value={data.total_pendentes_no_tipo} tone="text-rose-600" />
            </div>
            <div className="rounded-md border bg-muted/30 p-3 text-xs">
              <p className="text-muted-foreground">
                Cobertura no tipo:{" "}
                <span className="font-semibold text-foreground">{pct.toFixed(1)}%</span>
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium">Nomes de origem mapeados</p>
              <div className="max-h-72 overflow-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Texto de origem (normalizado)</th>
                      <th className="p-2 text-left">Texto original</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.aliases.map((a) => (
                      <tr key={a.texto_origem_norm} className="border-t">
                        <td className="p-2 font-mono text-[11px]">{a.texto_origem_norm}</td>
                        <td className="p-2">{a.texto_origem ?? "—"}</td>
                        <td className="p-2">
                          {a.revisado ? (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-600/40">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> revisado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-600/40">
                              <AlertCircle className="h-3 w-3 mr-1" /> pendente
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                    {data.aliases.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-muted-foreground">
                          Nenhum alias mapeado para este canônico.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-2 py-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${tone ?? ""}`}>{value.toLocaleString("pt-BR")}</p>
    </div>
  );
}