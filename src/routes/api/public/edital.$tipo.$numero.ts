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

export const Route = createFileRoute("/api/public/edital/$tipo/$numero")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const tipo = params.tipo;
        const numero = params.numero;
        const subfolder = tipo === "cp" ? "concurso" : tipo === "ps" ? "ps" : null;
        if (!subfolder) return new Response("Tipo inválido", { status: 400 });

        // "04/2024" -> "04_2024.pdf"
        const safeNum = numero.replace(/\//g, "_").replace(/[^0-9_\-]/g, "");
        const filename = `${safeNum}.pdf`;

        if (!process.env.LOVABLE_API_KEY || !process.env.GOOGLE_DRIVE_API_KEY) {
          return new Response("Conexão Google Drive ausente", { status: 500 });
        }

        try {
          const admId = await findFolderId("ADM");
          if (!admId) return new Response("Pasta ADM não encontrada", { status: 404 });
          const subId = await findFolderId(subfolder, admId);
          if (!subId) return new Response(`Subpasta ${subfolder} não encontrada`, { status: 404 });
          const fileId = await findFileId(filename, subId);
          if (!fileId) return new Response(`Arquivo ${filename} não encontrado`, { status: 404 });

          const fileRes = await fetch(`${GATEWAY}/files/${fileId}?alt=media`, {
            headers: gwHeaders(),
          });
          if (!fileRes.ok || !fileRes.body) {
            return new Response(`Falha ao baixar PDF (${fileRes.status})`, { status: 502 });
          }

          const url = new URL(request.url);
          const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";

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