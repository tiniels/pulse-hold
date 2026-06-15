import { createFileRoute } from "@tanstack/react-router";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive/drive/v3";

const folderCache = new Map<string, string>();

function gwHeaders() {
  return {
    Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": process.env.GOOGLE_DRIVE_API_KEY ?? "",
  };
}

async function findFolderId(name: string, parentId?: string): Promise<string | null> {
  const cacheKey = `${parentId ?? "root"}/${name}`;
  const cached = folderCache.get(cacheKey);
  if (cached) return cached;
  const qParts = [
    `name='${name.replace(/'/g, "\\'")}'`,
    `mimeType='application/vnd.google-apps.folder'`,
    `trashed=false`,
  ];
  if (parentId) qParts.push(`'${parentId}' in parents`);
  const url = `${GATEWAY}/files?q=${encodeURIComponent(qParts.join(" and "))}&fields=files(id,name)&pageSize=10`;
  const res = await fetch(url, { headers: gwHeaders() });
  if (!res.ok) throw new Error(`Drive folder lookup failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { files?: Array<{ id: string; name: string }> };
  const id = json.files?.[0]?.id ?? null;
  if (id) folderCache.set(cacheKey, id);
  return id;
}

async function findFileId(name: string, parentId: string): Promise<string | null> {
  const q = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`;
  const url = `${GATEWAY}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=5`;
  const res = await fetch(url, { headers: gwHeaders() });
  if (!res.ok) throw new Error(`Drive file lookup failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { files?: Array<{ id: string; name: string }> };
  return json.files?.[0]?.id ?? null;
}

async function findFileFuzzy(
  candidates: string[],
  parentId: string,
): Promise<{ id: string; name: string } | null> {
  // Try exact-name matches first
  for (const name of candidates) {
    const id = await findFileId(name, parentId);
    if (id) return { id, name };
  }
  // Fallback: list all PDFs in the folder and match by normalized digits
  const q = `'${parentId}' in parents and trashed=false and mimeType='application/pdf'`;
  const url = `${GATEWAY}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1000`;
  const res = await fetch(url, { headers: gwHeaders() });
  if (!res.ok) return null;
  const json = (await res.json()) as { files?: Array<{ id: string; name: string }> };
  const files = json.files ?? [];
  const wanted = candidates.map((c) => c.replace(/\.pdf$/i, "").replace(/^0+/, ""));
  for (const f of files) {
    const base = f.name.replace(/\.pdf$/i, "").replace(/^0+/, "");
    if (wanted.includes(base)) return f;
  }
  return null;
}

export const Route = createFileRoute("/api/public/edital/$tipo/$numero")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const tipo = params.tipo;
        const numero = params.numero;
        const subfolder = tipo === "cp" ? "concurso" : tipo === "ps" ? "ps" : null;
        if (!subfolder) return new Response("Tipo inválido", { status: 400 });

        // "04/2024" -> tenta "04_2024.pdf", "4_2024.pdf", "04-2024.pdf", "4-2024.pdf"
        const cleaned = numero.replace(/[^0-9/\-_]/g, "");
        const parts = cleaned.split(/[\/_-]/).filter(Boolean);
        const candidates = new Set<string>();
        if (parts.length >= 1) {
          const a = parts[0];
          const aNoPad = a.replace(/^0+/, "") || "0";
          const aPad = a.padStart(2, "0");
          const rest = parts.slice(1).join("_");
          const restDash = parts.slice(1).join("-");
          if (rest) {
            candidates.add(`${aPad}_${rest}.pdf`);
            candidates.add(`${aNoPad}_${rest}.pdf`);
            candidates.add(`${aPad}-${restDash}.pdf`);
            candidates.add(`${aNoPad}-${restDash}.pdf`);
          } else {
            candidates.add(`${aPad}.pdf`);
            candidates.add(`${aNoPad}.pdf`);
          }
        }
        const candidateList = Array.from(candidates);
        const primary = candidateList[0] ?? `${cleaned}.pdf`;

        if (!process.env.LOVABLE_API_KEY || !process.env.GOOGLE_DRIVE_API_KEY) {
          return new Response("Conexão Google Drive ausente", { status: 500 });
        }

        try {
          const admId = await findFolderId("ADM");
          if (!admId) return new Response("Pasta ADM não encontrada", { status: 404 });
          const subId = await findFolderId(subfolder, admId);
          if (!subId) return new Response(`Subpasta ${subfolder} não encontrada`, { status: 404 });
          const found = await findFileFuzzy(candidateList, subId);
          if (!found)
            return new Response(
              `Arquivo não encontrado. Tentativas: ${candidateList.join(", ")}`,
              { status: 404 },
            );
          const fileId = found.id;
          const filename = found.name;

          const fileRes = await fetch(`${GATEWAY}/files/${fileId}?alt=media`, {
            headers: gwHeaders(),
          });
          if (!fileRes.ok || !fileRes.body) {
            return new Response(`Falha ao baixar PDF (${fileRes.status})`, { status: 502 });
          }

          const url = new URL(request.url);
          const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";

          void primary;
          return new Response(fileRes.body, {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `${disposition}; filename="${filename}"`,
              "Cache-Control": "private, max-age=300",
            },
          });
        } catch (e) {
          return new Response(`Erro: ${(e as Error).message}`, { status: 500 });
        }
      },
    },
  },
});