"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { dictionaries, type Language } from "@/lib/i18n/dictionary"

const STORAGE_KEY = "qxlive.lang"

type Ctx = {
  /** Current active language. Defaults to "en" before hydration finishes. */
  language: Language
  /** Whether the user has explicitly selected a language at least once. */
  isSelected: boolean
  /** Set the active language and persist to localStorage. */
  setLanguage: (lang: Language) => void
  /** Translate a key into the current language (falls back to the key itself). */
  t: (key: string) => string
  /** Has the provider mounted on the client (used to avoid hydration flashes). */
  ready: boolean
}

const LanguageContext = createContext<Ctx | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default to "en" so SSR + first client render match. We then read the stored
  // preference inside an effect and re-render with it.
  const [language, setLanguageState] = useState<Language>("en")
  const [isSelected, setIsSelected] = useState(false)
  const [ready, setReady] = useState(false)

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === "en" || stored === "bn") {
        setLanguageState(stored)
        setIsSelected(true)
      }
    } catch {
      /* localStorage unavailable — keep defaults */
    }
    setReady(true)
  }, [])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    setIsSelected(true)
    try {
      window.localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* ignore */
    }
  }, [])

  const t = useCallback(
    (key: string) => {
      const dict = dictionaries[language] ?? dictionaries.en
      return dict[key] ?? dictionaries.en[key] ?? key
    },
    [language],
  )

  const value = useMemo<Ctx>(
    () => ({ language, isSelected, setLanguage, t, ready }),
    [language, isSelected, setLanguage, t, ready],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): Ctx {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    // Graceful fallback — useful during SSR or when accidentally rendered outside provider
    return {
      language: "en",
      isSelected: false,
      setLanguage: () => {},
      t: (k) => dictionaries.en[k] ?? k,
      ready: false,
    }
  }
  return ctx
}
