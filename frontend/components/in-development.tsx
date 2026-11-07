"use client"

import { Wrench, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface InDevelopmentProps {
  title?: string
  backHref?: string
}

export function InDevelopment({ title, backHref = "/profile" }: InDevelopmentProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Wrench className="h-8 w-8" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {title ?? "Feature"}
          </p>
          <h1 className="text-balance text-3xl font-semibold text-foreground sm:text-4xl">
            In Development
          </h1>
          <p className="text-pretty leading-relaxed text-muted-foreground">
            This feature is currently being built. Please check back soon.
          </p>
        </div>
        <Button asChild variant="outline" className="mt-2 bg-transparent">
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back to Profile
          </Link>
        </Button>
      </div>
    </main>
  )
}
