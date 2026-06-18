import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { obterFila, convocarCandidato } from "@/lib/convocacao.functions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Trophy, ChevronRight, Users, Briefcase, Clock, Wallet, GraduationCap, Gift, Plus, FileText, Calendar, AlertCircle } from "lucide-react";
import { getCargoInfo, formatBRL, nivelTone, displayOrFallback } from "@/lib/cargo-info";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cargoNome: string | null;
};

export function FilaConvocacaoDialog({ open, onOpenChange, cargoNome }: Props) {
  const [lista, setLista] = useState<"GERAL" | "PCD" | "MSVD" | "TODAS">("TODAS");
  const obterFn = useServerFn(obterFila);
  const convocarFn = useServerFn(convocarCandidato);
  const qc = useQueryClient();

  const info = getCargoInfo(cargoNome);

  const q = useQuery({
    queryKey: ["fila", cargoNome, lista],
    queryFn: () => obterFn({ data: { cargoNome: cargoNome!, lista } }),
    enabled: open && !!cargoNome,
  });

  const m = useMutation({
    mutationFn: (candidatoId: string) => convocarFn({ data: { candidatoId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fila", cargoNome] }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 gap-0 sm:rounded-lg overflow-hidden">
        <DialogHeader className="border-b px-5 py-3 space-y-1">
          <DialogTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Fila de Convocação — {cargoNome}
          </DialogTitle>
          {q.data?.stats && (
            <div className="text-xs text-muted-foreground flex gap-3">
              <span><b>{q.data.stats.disponiveis}</b> disponíveis</span>
              <span><b>{q.data.stats.convocados}</b> convocados</span>
              <span><b>{q.data.stats.total}</b> total</span>
            </div>
          )}
        </DialogHeader>

        <div className="px-5 pt-3">
          <Tabs value={lista} onValueChange={(v) => setLista(v as any)}>
            <TabsList>
              <TabsTrigger value="TODAS">Todas</TabsTrigger>
              <TabsTrigger value="GERAL">Geral</TabsTrigger>
              <TabsTrigger value="PCD">PcD</TabsTrigger>
              <TabsTrigger value="MSVD">MSVD</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="max-h-[70vh] overflow-auto p-5 pt-3 space-y-4">
          {info && <CargoInfoPanel info={info} />}

          {q.isLoading && <div className="text-sm text-muted-foreground">Carregando fila…</div>}
          {q.error && <div className="text-sm text-destructive">Erro: {(q.error as Error).message}</div>}

          {q.data && (
            <>
              <section>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" /> Próximos da fila ({q.data.fila.length})
                </h3>
                {q.data.fila.length === 0 ? (
                  <div className="rounded-md border p-4 text-sm text-muted-foreground">
                    Nenhum candidato disponível.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {q.data.fila.map((c: any, idx: number) => (
                      <div key={c.id} className="flex items-center gap-3 rounded-md border bg-card p-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{c.nome}</div>
                          <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-0.5">
                            <Badge variant="outline" className="text-xs">
                              {c.concurso_tipo} {c.concurso_numero}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">{c.lista_tipo}</Badge>
                            <span>Classif: <b>{c.classificacao ?? "—"}</b></span>
                            <span>Nota: <b>{c.nota ?? "—"}</b></span>
                            <span>Realização: {fmtDate(c.concurso_data_realizacao)}</span>
                          </div>
                          {c.observacao && (
                            <div className="text-xs text-muted-foreground italic mt-1">
                              {c.observacao}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => m.mutate(c.id)}
                          disabled={m.isPending}
                        >
                          <Phone className="mr-1.5 h-4 w-4" /> Convocar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {q.data.convocados.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Trophy className="h-4 w-4" /> Já convocados ({q.data.convocados.length})
                  </h3>
                  <div className="space-y-1">
                    {q.data.convocados.slice(0, 50).map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                        <div className="truncate">
                          <span className="font-medium">{c.nome}</span>
                          <span className="text-muted-foreground"> · {c.concurso_tipo} {c.concurso_numero} · classif {c.classificacao ?? "—"}</span>
                        </div>
                        <Badge className="bg-success text-success-foreground">{c.status}</Badge>
                      </div>
                    ))}
                    {q.data.convocados.length > 50 && (
                      <div className="text-xs text-muted-foreground">+ {q.data.convocados.length - 50} convocados anteriores…</div>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}