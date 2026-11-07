import { Readable } from "node:stream"
import archiver from "archiver"

import { ARCHIVE_FOLDER, archiveFileName, listSourceFiles } from "@/lib/source-archive"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /download/source
 * Streams the full website source code as a zip file
 * (secrets, node_modules, build output and git history excluded).
 */
export async function GET() {
  const files = listSourceFiles()
  if (files.length === 0) {
    return Response.json({ error: "Source files are not available on this server." }, { status: 404 })
  }

  const archive = archiver("zip", { zlib: { level: 9 } })
  archive.on("warning", (err) => console.warn("[download] archive warning:", err.message))
  archive.on("error", (err) => console.error("[download] archive error:", err.message))

  for (const f of files) {
    archive.file(f.abs, { name: `${ARCHIVE_FOLDER}/${f.rel}` })
  }
  void archive.finalize()

  const body = Readable.toWeb(archive) as unknown as ReadableStream<Uint8Array>
  const name = archiveFileName()

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "X-File-Count": String(files.length),
    },
  })
}
