import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Calendar, LogOut, TrendingUp, UserPlus } from "lucide-react";
import type { Evolucao } from "@/lib/evolucoes.functions";

function fmt(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  nome: string;
  matricula: string;
  eventos: Evolucao[]; // já filtrados/ordenados por evolucao_data ASC
};

export function JornadaTimeline({ open, onClose, nome, matricula, eventos }: Props) {
  const admissao = eventos.find((e) => e.data_admissao)?.data_admissao ?? null;
  const rescisao = eventos.find((e) => e.data_rescisao)?.data_rescisao ?? null;
  const rescisaoDesc = eventos.find((e) => e.rescisao_descricao)?.rescisao_descricao ?? null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            Jornada do Servidor
          </DialogTitle>
          <p className="text-sm font-semibold mt-1">{nome}</p>
          <p className="text-xs text-muted-foreground">Matrícula: {matricula} • {eventos.length} eventos</p>
        </DialogHeader>

        <div className="relative pl-6 mt-2 space-y-3 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
          {/* Admissão */}
          <Item
            icon={<UserPlus className="h-3 w-3" />}
            color="bg-emerald-500"
            date={admissao}
            title="Admissão"
            subtitle={eventos[0]?.cargo_atual_nome ?? ""}
            extra={eventos[0]?.secretaria_nome ?? ""}
          />

          {/* Evoluções (sem a linha de admissão duplicada) */}
          {eventos.map((e, i) => {
            const isAdmissao = (e.fundamento_categoria ?? "") === "Admissão";
            if (isAdmissao && i === 0) return null;
            const isReestrut = (e.fundamento_categoria ?? "") === "Reestruturação Administrativa";
            return (
              <Item
                key={e.id}
                icon={<TrendingUp className="h-3 w-3" />}
                color={isReestrut ? "bg-amber-500" : "bg-blue-500"}
                date={e.evolucao_data}
                title={e.evolucao_cargo_nome ?? "Evolução"}
                subtitle={e.evolucao_fundamento ?? ""}
                badge={e.fundamento_categoria ?? undefined}
              />
            );
          })}

          {/* Rescisão */}
          <Item
            icon={<LogOut className="h-3 w-3" />}
            color="bg-destructive"
            date={rescisao}
            title="Rescisão"
            subtitle={rescisaoDesc ?? ""}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Item({
  icon, color, date, title, subtitle, extra, badge,
}: {
  icon: React.ReactNode; color: string; date: string | null;
  title: string; subtitle?: string; extra?: string; badge?: string;
}) {
  return (
    <div className="relative">
      <span className={`absolute -left-[18px] top-1 h-4 w-4 rounded-full ${color} flex items-center justify-center text-white`}>
        {icon}
      </span>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">{fmt(date)}</span>
            {badge && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{badge}</Badge>}
          </div>
          <div className="text-sm font-medium mt-0.5 flex items-center gap-1.5">
            <Briefcase className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="truncate">{title}</span>
          </div>
          {subtitle && <div className="text-xs text-muted-foreground ml-5 line-clamp-2">{subtitle}</div>}
          {extra && <div className="text-xs text-muted-foreground ml-5">{extra}</div>}
        </div>
      </div>
    </div>
  );
}