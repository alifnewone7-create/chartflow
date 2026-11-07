import { archiveFileName, listSourceFiles } from "@/lib/source-archive"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /download/info
 * Summary of what the source zip will contain (for the /download page).
 */
export async function GET() {
  const files = listSourceFiles()
  const totalBytes = files.reduce((s, f) => s + f.size, 0)
  const lastUpdated = files.reduce((m, f) => Math.max(m, f.mtime), 0)

  const folders: Record<string, number> = {}
  for (const f of files) {
    const parts = f.rel.split("/")
    const top = parts.length > 1 ? parts[0] : "(root)"
    folders[top] = (folders[top] ?? 0) + 1
  }

  return Response.json(
    {
      available: files.length > 0,
      fileCount: files.length,
      totalBytes,
      lastUpdated: lastUpdated ? new Date(lastUpdated).toISOString() : null,
      fileName: archiveFileName(),
      folders: Object.entries(folders)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}
