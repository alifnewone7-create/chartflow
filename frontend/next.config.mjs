import fs from "node:fs"
import path from "node:path"
import envPkg from "@next/env"

// Server-only secrets (e.g. FIREBASE_SERVICE_ACCOUNT) live in backend/.env
const backendEnv = path.resolve(process.cwd(), "../backend/.env")
if (fs.existsSync(backendEnv)) {
  envPkg.processEnv([{ path: ".env", contents: fs.readFileSync(backendEnv, "utf8"), env: {} }], path.dirname(backendEnv), console, true)
}
// Preview stores the ChartFlow project's web key under its own name.
if (process.env.CHARTFLOW_FIREBASE_API_KEY) {
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = process.env.CHARTFLOW_FIREBASE_API_KEY
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
