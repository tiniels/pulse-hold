import { useEffect, useState } from "react";

const PHRASES = [
  "Organizando seus dados...",
  "Preparando gráficos...",
  "Otimizando desempenho...",
  "Conectando aos serviços...",
  "Verificando permissões...",
  "Aplicando configurações...",
  "Sincronizando informações...",
  "Tudo ficará pronto em instantes.",
];

const STEPS = [
  "Carregando",
  "Verificando banco",
  "Preparando gráficos",
  "Organizando dados",
];

export function LoadingScreen() {
  const [hidden, setHidden] = useState(false);
  const [fading, setFading] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const start = () => {
      setFading(true);
      setTimeout(() => setHidden(true), 500);
    };
    if (document.readyState === "complete") {
      const t = setTimeout(start, 600);
      return () => clearTimeout(t);
    }
    const onLoad = () => setTimeout(start, 600);
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  useEffect(() => {
    const p = setInterval(() => setPhraseIdx((i) => (i + 1) % PHRASES.length), 1800);
    const s = setInterval(
      () => setStepIdx((i) => Math.min(i + 1, STEPS.length)),
      650,
    );
    return () => {
      clearInterval(p);
      clearInterval(s);
    };
  }, []);

  if (hidden) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Carregando DP - CAB"
      className="lovable-loading"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.5s ease",
        pointerEvents: fading ? "none" : "auto",
        background:
          "linear-gradient(rgba(15,23,42,0.55), rgba(15,23,42,0.55))",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 980,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          gap: 24,
          alignItems: "stretch",
        }}
        className="lovable-loading-grid"
      >
        {/* Skeleton dashboard "waking up" */}
        <div
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
          }}
        >
          <SkeletonBar w="60%" h={22} />
          <div style={{ height: 12 }} />
          <SkeletonBar w="35%" h={14} />
          <div style={{ height: 20 }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}
          >
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div style={{ height: 20 }} />
          <SkeletonBar w="100%" h={120} radius={10} />
          <div style={{ height: 12 }} />
          <SkeletonBar w="80%" h={14} />
          <div style={{ height: 8 }} />
          <SkeletonBar w="55%" h={14} />
        </div>

        {/* Robot chat */}
        <div
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 16,
            padding: 22,
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              aria-hidden
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background:
                  "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(56,189,248,0.9))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                animation: "lovable-bob 2.2s ease-in-out infinite",
              }}
            >
              🤖
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Olá!</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                Estou preparando tudo para você.
              </div>
            </div>
          </div>

          <div
            style={{
              background: "rgba(0,0,0,0.25)",
              borderRadius: 12,
              padding: "12px 14px",
              fontSize: 13,
              minHeight: 44,
              display: "flex",
              alignItems: "center",
            }}
            key={phraseIdx}
            className="lovable-phrase"
          >
            {PHRASES[phraseIdx]}
          </div>

          <div
            style={{
              height: 1,
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
            }}
          />

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 13,
            }}
          >
            {STEPS.map((s, i) => {
              const done = i < stepIdx;
              const active = i === stepIdx;
              return (
                <li
                  key={s}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    opacity: done || active ? 1 : 0.45,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: done
                        ? "rgba(34,197,94,0.85)"
                        : active
                          ? "rgba(56,189,248,0.85)"
                          : "rgba(255,255,255,0.15)",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#0b1220",
                      animation: active ? "lovable-pulse 1s ease-in-out infinite" : undefined,
                    }}
                  >
                    {done ? "✓" : ""}
                  </span>
                  <span>{s}</span>
                </li>
              );
            })}
          </ul>

          <div style={{ fontSize: 12, opacity: 0.7, marginTop: "auto" }}>
            Quase pronto...
          </div>
        </div>
      </div>

      <style>{`
        @keyframes lovable-shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes lovable-bob {
          0%,100% { transform: translateY(0) }
          50% { transform: translateY(-4px) }
        }
        @keyframes lovable-pulse {
          0%,100% { transform: scale(1); opacity: 1 }
          50% { transform: scale(1.15); opacity: 0.85 }
        }
        @keyframes lovable-fade-in {
          from { opacity: 0; transform: translateY(4px) }
          to { opacity: 1; transform: translateY(0) }
        }
        .lovable-phrase { animation: lovable-fade-in 0.4s ease-out; }
        .lovable-skel {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.08) 0%,
            rgba(255,255,255,0.22) 50%,
            rgba(255,255,255,0.08) 100%);
          background-size: 800px 100%;
          animation: lovable-shimmer 1.4s linear infinite;
          border-radius: 6px;
          display: block;
        }
        @media (max-width: 760px) {
          .lovable-loading-grid { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lovable-skel, .lovable-phrase { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

function SkeletonBar({
  w,
  h,
  radius = 6,
}: {
  w: string | number;
  h: number;
  radius?: number;
}) {
  return (
    <span
      className="lovable-skel"
      style={{ width: w, height: h, borderRadius: radius }}
    />
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <SkeletonBar w="55%" h={10} />
      <SkeletonBar w="80%" h={22} />
      <SkeletonBar w="40%" h={10} />
    </div>
  );
}