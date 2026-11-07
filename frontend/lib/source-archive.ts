import fs from "node:fs"
import path from "node:path"

/**
 * Source-code archive helpers for the public /download page.
 *
 * The project root is the parent of the Next.js app (`/app`), so the zip
 * contains frontend + backend + docs. Anything secret, generated or huge
 * is excluded so the archive is safe to share publicly.
 */

export const SOURCE_ROOT = process.env.SOURCE_ARCHIVE_ROOT || path.resolve(process.cwd(), "..")
export const ARCHIVE_FOLDER = "chartflow-ai"

// Directory names skipped anywhere in the tree
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".emergent",
  ".vercel",
  ".yarn",
  ".cache",
  ".turbo",
  "__pycache__",
  ".ruff_cache",
  ".pytest_cache",
  ".mypy_cache",
  ".venv",
  "venv",
  "coverage",
  "test_reports",
  ".snowflake",
  ".v0-trash",
])

// Relative paths (from SOURCE_ROOT) skipped entirely
const EXCLUDED_PATHS = new Set([
  "frontend/python_backend/data",
  "memory/test_credentials.md",
])

function isExcludedFile(name: string): boolean {
  const lower = name.toLowerCase()
  // Secrets: .env, .env.local, .env.production ... (keep .env.example templates)
  if (lower === ".env" || (lower.startsWith(".env.") && !lower.endsWith(".example"))) return true
  if (lower === ".gitconfig" || lower === ".npmrc" || lower === ".ds_store") return true
  if (lower.endsWith(".log") || lower.endsWith(".pem") || lower.endsWith(".key")) return true
  if (lower.endsWith(".session") || lower === "session.json" || lower === "cookies.json") return true
  if (lower.endsWith(".zip") || lower.endsWith(".tsbuildinfo")) return true
  return false
}

export type SourceFile = { abs: string; rel: string; size: number; mtime: number }

/** Recursively list every file that will go into the archive. */
export function listSourceFiles(root: string = SOURCE_ROOT): SourceFile[] {
  const out: SourceFile[] = []
  const walk = (dir: string) => {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const abs = path.join(dir, e.name)
      const rel = path.relative(root, abs).split(path.sep).join("/")
      if (EXCLUDED_PATHS.has(rel)) continue
      if (e.isSymbolicLink()) continue
      if (e.isDirectory()) {
        if (EXCLUDED_DIRS.has(e.name)) continue
        walk(abs)
      } else if (e.isFile()) {
        if (isExcludedFile(e.name)) continue
        try {
          const st = fs.statSync(abs)
          out.push({ abs, rel, size: st.size, mtime: st.mtimeMs })
        } catch {
          /* unreadable file — skip */
        }
      }
    }
  }
  walk(root)
  out.sort((a, b) => a.rel.localeCompare(b.rel))
  return out
}

export function archiveFileName(date = new Date()): string {
  const d = date.toISOString().slice(0, 10)
  return `${ARCHIVE_FOLDER}-source-${d}.zip`
}
