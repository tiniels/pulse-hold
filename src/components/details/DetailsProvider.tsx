import { createContext, Suspense, useCallback, useContext, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, Calendar, User, IdCard, Building2, Phone } from "lucide-react";
import { useCargoLookup, formatBRL, nivelTone, displayOrFallback } from "@/lib/cargo-info";
import { getServidorFicha, type ServidorFicha } from "@/lib/servidor.functions";

type CargoTarget = { nome: string; vinculo?: string | null };
type ServidorTarget = { nome?: string | null; prontuario?: string | null };

type Ctx = {
  openCargo: (t: CargoTarget) => void;
  openServidor: (t: ServidorTarget) => void;
};

const DetailsCtx = createContext<Ctx | null>(null);

export function useDetails() {
  const ctx = useContext(DetailsCtx);
  if (!ctx) throw new Error("useDetails must be used within DetailsProvider");
  return ctx;
}

export function DetailsProvider({ children }: { children: ReactNode }) {
  const [cargo, setCargo] = useState<CargoTarget | null>(null);
  const [servidor, setServidor] = useState<ServidorTarget | null>(null);

  const openCargo = useCallback((t: CargoTarget) => setCargo(t), []);
  const openServidor = useCallback((t: ServidorTarget) => setServidor(t), []);

  return (
    <DetailsCtx.Provider value={{ openCargo, openServidor }}>
      {children}
      {cargo && <CargoDetailDialog target={cargo} onClose={() => setCargo(null)} />}
      {servidor && <ServidorDetailDialog target={servidor} onClose={() => setServidor(null)} />}
    </DetailsCtx.Provider>
  );
}

function CargoDetailDialog({ target, onClose }: { target: CargoTarget; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4 text-primary" />
            <span className="truncate">{target.nome}</span>
          </DialogTitle>
        </DialogHeader>
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <CargoDetailBody target={target} />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}

function CargoDetailBody({ target }: { target: CargoTarget }) {
  const lookup = useCargoLookup();
  const info = lookup.get(target.nome, target.vinculo ?? null);
  if (!info) {
    return (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Este cargo ainda não está cadastrado no MDM (dim_cargo). Cadastre em <b>/mdm → Cargos</b> para que os detalhes apareçam automaticamente aqui.
          </div>
    );
  }
  return (
    <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              {info.vinculo && <Badge variant="outline">{info.vinculo}</Badge>}
              {info.nivel && <Badge className={nivelTone(info.nivel)} variant="outline">{info.nivel}</Badge>}
              {info.jornada && <Badge variant="secondary">{info.jornada}</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Salário base" value={formatBRL(info.salarioBase)} />
              <Field label="Salário real esperado" value={formatBRL(info.salarioReal)} />
            </div>
            <Separator />
            <Block label="Requisitos" value={displayOrFallback(info.requisitos)} />
            <Block label="Benefícios" value={displayOrFallback(info.beneficio)} />
            <Block label="Adicionais" value={displayOrFallback(info.adicionais)} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}

function Block({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function ServidorDetailDialog({ target, onClose }: { target: ServidorTarget; onClose: () => void }) {
  const call = useServerFn(getServidorFicha);
  const q = useQuery({
    queryKey: ["servidor-ficha", target.prontuario ?? "", target.nome ?? ""],
    queryFn: () => call({ data: { prontuario: target.prontuario ?? null, nome: target.nome ?? null } }),
    staleTime: 30_000,
  });
  const ficha: ServidorFicha | undefined = q.data;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" />
            <span className="truncate">{ficha?.nome ?? target.nome ?? "Servidor"}</span>
            {ficha?.prontuario && (
              <Badge variant="outline" className="font-mono text-[10px]">
                <IdCard className="mr-1 h-3 w-3" /> {ficha.prontuario}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {q.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !ficha?.encontrado ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum registro encontrado nas bases (prontuários, admissões, rescisões, evoluções).
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cargo" value={ficha.cargo ?? "—"} />
              <Field label="Vínculo" value={ficha.vinculo ?? "—"} />
              <Field label="Secretaria" value={ficha.secretaria ?? "—"} />
              <Field label="Ano de ingresso" value={ficha.ano_ingresso ? String(ficha.ano_ingresso) : "—"} />
            </div>
            {(ficha.telefone || ficha.observacao) && (
              <div className="rounded-md border p-3 space-y-1">
                {ficha.telefone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {ficha.telefone}
                  </p>
                )}
                {ficha.observacao && (
                  <p className="text-xs whitespace-pre-wrap">{ficha.observacao}</p>
                )}
              </div>
            )}

            <Separator />

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Histórico funcional ({ficha.eventos.length})
              </p>
              {ficha.eventos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum evento registrado.</p>
              ) : (
                <ol className="relative space-y-2 border-l pl-4">
                  {ficha.eventos.map((e, i) => (
                    <li key={i} className="relative">
                      <span className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-background ${toneFor(e.tipo)}`} />
                      <div className="rounded-md border bg-card p-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize">{e.tipo}</Badge>
                          {e.data && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(e.data).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          {e.motivo && <Badge variant="secondary" className="text-[10px]">{e.motivo}</Badge>}
                        </div>
                        <p className="mt-1 text-xs font-medium">{e.descricao}</p>
                        <p className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2">
                          {e.cargo && <span><Briefcase className="inline h-3 w-3" /> {e.cargo}</span>}
                          {e.secretaria && <span><Building2 className="inline h-3 w-3" /> {e.secretaria}</span>}
                          {e.vinculo && <span>· {e.vinculo}</span>}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function toneFor(t: "admissao" | "rescisao" | "evolucao" | "chamamento") {
  switch (t) {
    case "admissao": return "bg-emerald-500";
    case "rescisao": return "bg-rose-500";
    case "evolucao": return "bg-sky-500";
    case "chamamento": return "bg-amber-500";
  }
}

export function CargoLink({
  nome,
  vinculo,
  className,
  children,
}: {
  nome: string | null | undefined;
  vinculo?: string | null;
  className?: string;
  children?: ReactNode;
}) {
  const { openCargo } = useDetails();
  const label = children ?? nome ?? "—";
  if (!nome) return <span className={className}>{label}</span>;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openCargo({ nome, vinculo: vinculo ?? null });
      }}
      className={`text-left hover:underline hover:text-primary transition-colors ${className ?? ""}`}
      title="Ver detalhes do cargo (MDM)"
    >
      {label}
    </button>
  );
}

export function ServidorLink({
  nome,
  prontuario,
  className,
  children,
}: {
  nome?: string | null;
  prontuario?: string | null;
  className?: string;
  children?: ReactNode;
}) {
  const { openServidor } = useDetails();
  const label = children ?? nome ?? prontuario ?? "—";
  if (!nome && !prontuario) return <span className={className}>{label}</span>;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openServidor({ nome: nome ?? null, prontuario: prontuario ?? null });
      }}
      className={`text-left hover:underline hover:text-primary transition-colors ${className ?? ""}`}
      title="Ver ficha do servidor"
    >
      {label}
    </button>
  );
}