import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePeriod } from "@/contexts/PeriodContext";

function fmt(d: Date | null): string {
  return d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "—";
}

type Preset = { label: string; build: () => { from: Date; to: Date } };

const PRESETS: Preset[] = [
  {
    label: "Mês atual",
    build: () => {
      const now = new Date();
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: now,
      };
    },
  },
  {
    label: "Últimos 30 dias",
    build: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);
      return { from, to };
    },
  },
  {
    label: "Trimestre atual",
    build: () => {
      const now = new Date();
      const q = Math.floor(now.getMonth() / 3);
      return { from: new Date(now.getFullYear(), q * 3, 1), to: now };
    },
  },
  {
    label: "YTD (ano atual)",
    build: () => {
      const now = new Date();
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    },
  },
  {
    label: "Últimos 12 meses",
    build: () => {
      const to = new Date();
      const from = new Date();
      from.setFullYear(from.getFullYear() - 1);
      return { from, to };
    },
  },
  {
    label: "Ano anterior",
    build: () => {
      const y = new Date().getFullYear() - 1;
      return { from: new Date(y, 0, 1), to: new Date(y, 11, 31) };
    },
  },
];

export function GlobalPeriodFilter({ className }: { className?: string }) {
  const { period, setPeriod, reset } = usePeriod();
  const [open, setOpen] = useState(false);

  const label =
    period.from && period.to
      ? `${fmt(period.from)} → ${fmt(period.to)}`
      : "Selecionar período";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-normal"
            aria-label="Filtro global de período"
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">Período</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex flex-col sm:flex-row">
            <div className="border-b sm:border-b-0 sm:border-r p-2 flex sm:flex-col gap-1 flex-wrap sm:flex-nowrap min-w-[160px]">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 py-1 w-full">
                Atalhos
              </div>
              {PRESETS.map((p) => (
                <Button
                  key={p.label}
                  variant="ghost"
                  size="sm"
                  className="h-7 justify-start text-xs font-normal"
                  onClick={() => {
                    const { from, to } = p.build();
                    setPeriod({ from, to });
                  }}
                >
                  {p.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 justify-start text-xs font-normal text-muted-foreground"
                onClick={() => reset()}
              >
                Restaurar padrão
              </Button>
            </div>
            <div className="p-2">
              <Calendar
                mode="range"
                locale={ptBR}
                selected={{
                  from: period.from ?? undefined,
                  to: period.to ?? undefined,
                }}
                onSelect={(range) => {
                  setPeriod({
                    from: range?.from ?? null,
                    to: range?.to ?? null,
                  });
                }}
                numberOfMonths={2}
                className={cn("pointer-events-auto")}
              />
              <div className="flex justify-end pt-1">
                <Button size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>
                  Aplicar
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {period.from && period.to ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          aria-label="Limpar período"
          onClick={() => setPeriod({ from: null, to: null })}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}