import { MEDIA_HOSTS } from "@/lib/download";

/**
 * **A library file, handed back as a download** — `?url=` the file, `?name=`
 * what to save it as.
 *
 * The files live on the media bucket, a different origin from the app, and it
 * sends no `Content-Disposition` and no CORS headers. So the browser ignores
 * `<a download>` on them and opens the file instead — an MP3 starts playing in
 * a tab — and Download all, which clicked one such link per file, got one tab
 * and then a popup blocker. Coming back through here makes the link
 * same-origin and the response an attachment, which every browser saves.
 *
 * Streamed straight through, never buffered: a shivir session runs to 40 MB.
 * Only the bucket's own host is fetched, so this is not an open proxy.
 */
export const maxDuration = 300;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  let source: URL;
  try {
    source = new URL(params.get("url") ?? "");
  } catch {
    return new Response("Bad url", { status: 400 });
  }
  if (source.protocol !== "https:" || !MEDIA_HOSTS.includes(source.hostname)) {
    return new Response("Not a library file", { status: 400 });
  }

  const upstream = await fetch(source, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return new Response("File not found", { status: upstream.status === 404 ? 404 : 502 });
  }

  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
    "Content-Disposition": disposition(params.get("name"), source),
    "Cache-Control": "public, max-age=86400",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  return new Response(upstream.body, { headers });
}

/**
 * `attachment`, named for the file's title with the bucket's extension —
 * "तदाकार, संस्कार-1.mp3" rather than a 32-character hash. Two forms: an ASCII
 * fallback for old clients, and `filename*` for the Devanagari most titles are.
 */
function disposition(name: string | null, source: URL): string {
  const file = source.pathname.split("/").pop() ?? "file";
  const ext = file.includes(".") ? file.slice(file.lastIndexOf(".")) : "";
  const title = (name ?? "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").trim().slice(0, 150);
  const full = title ? (title.toLowerCase().endsWith(ext.toLowerCase()) ? title : title + ext) : file;
  const ascii = full.replace(/[^\x20-\x7e]+/g, "_").replace(/"/g, "");
  return `attachment; filename="${ascii || file}"; filename*=UTF-8''${encodeURIComponent(full)}`;
}
