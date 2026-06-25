import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Period = { from: Date | null; to: Date | null };

type PeriodCtx = {
  period: Period;
  setPeriod: (p: Period) => void;
  /** ISO date strings (yyyy-mm-dd) or null */
  fromISO: string | null;
  toISO: string | null;
  /** true when both bounds are set */
  active: boolean;
  reset: () => void;
};

const Ctx = createContext<PeriodCtx | null>(null);

const STORAGE_KEY = "dpcab.global-period.v1";

function toISO(d: Date | null): string | null {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultPeriod(): Period {
  const now = new Date();
  const from = new Date(now.getFullYear(), 0, 1);
  return { from, to: now };
}

function loadPeriod(): Period {
  if (typeof window === "undefined") return defaultPeriod();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPeriod();
    const parsed = JSON.parse(raw) as { from?: string; to?: string };
    return {
      from: parsed.from ? new Date(parsed.from) : null,
      to: parsed.to ? new Date(parsed.to) : null,
    };
  } catch {
    return defaultPeriod();
  }
}

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<Period>(() => defaultPeriod());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPeriod(loadPeriod());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ from: toISO(period.from), to: toISO(period.to) }),
    );
  }, [period, hydrated]);

  const value = useMemo<PeriodCtx>(() => {
    const fromISOv = toISO(period.from);
    const toISOv = toISO(period.to);
    return {
      period,
      setPeriod,
      fromISO: fromISOv,
      toISO: toISOv,
      active: !!fromISOv && !!toISOv,
      reset: () => setPeriod(defaultPeriod()),
    };
  }, [period]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePeriod(): PeriodCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePeriod must be used inside <PeriodProvider>");
  return v;
}

/** Helper for components that want both ISO strings + Date forms */
export function periodToISO(p: Period): { fromISO: string | null; toISO: string | null } {
  return { fromISO: toISO(p.from), toISO: toISO(p.to) };
}