import { useEffect, useState } from "react";
import bg from "@/assets/cab-background.png.asset.json";

export function LoadingScreen() {
  const [hidden, setHidden] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const start = () => {
      setFading(true);
      setTimeout(() => setHidden(true), 500);
    };
    if (document.readyState === "complete") {
      const t = setTimeout(start, 250);
      return () => clearTimeout(t);
    }
    const onLoad = () => setTimeout(start, 250);
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  if (hidden) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Carregando"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundImage: `url(${bg.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.5s ease",
        willChange: "opacity",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15,23,42,0.55)",
          backdropFilter: "blur(4px)",
        }}
      />
      <div style={{ position: "relative", textAlign: "center", color: "#fff" }}>
        <div
          aria-hidden
          style={{
            width: 56,
            height: 56,
            border: "4px solid rgba(255,255,255,0.25)",
            borderTopColor: "#fff",
            borderRadius: "50%",
            margin: "0 auto 16px",
            animation: "lovable-spin 0.9s linear infinite",
          }}
        />
        <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: 0.5 }}>
          Carregando DP - CAB…
        </div>
      </div>
      <style>{`@keyframes lovable-spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion: reduce){[role=status] div[aria-hidden]{animation:none!important}}`}</style>
    </div>
  );
}