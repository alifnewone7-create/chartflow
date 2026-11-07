"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState, type FormEvent } from "react"
import { ArrowLeft, Lock, Mail, User } from "lucide-react"

import { useFirebaseUser } from "@/hooks/use-firebase-user"
import { authErrorKey, finishGoogleRedirect, loginWithGoogle, loginUser, registerUser, sendResetEmail } from "@/lib/user-auth"

import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/language-provider"
import { Emblem } from "@/components/home/primitives"
import { IconGemKey, IconShield } from "@/components/home/icons"
import { AuthDivider, AuthField, GoogleButton, SubmitButton } from "@/components/auth/auth-fields"

export type AuthMode = "login" | "register"

function useSubmit(action: (f: FormData) => Promise<void>) {
  const { t } = useLanguage()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    setError("")
    try {
      await action(new FormData(e.currentTarget))
      router.replace("/profile")
    } catch (err) {
      setError(t(authErrorKey(err)))
      setBusy(false)
    }
  }
  return { busy, error, onSubmit }
}

export function FormError({ message }: { message: string }) {
  if (!message) return null
  return (
    <p role="alert" data-testid="auth-error" className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
      {message}
    </p>
  )
}

const val = (f: FormData, k: string) => String(f.get(k) ?? "").trim()
const missing = () => Promise.reject({ code: "fields" })

function Tabs({ mode }: { mode: AuthMode }) {
  const { t } = useLanguage()
  const tabs = [
    { key: "login", href: "/login", label: t("auth.tab.login") },
    { key: "register", href: "/registration", label: t("auth.tab.register") },
  ]
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/6 bg-black/30 p-1" role="tablist">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          role="tab"
          aria-selected={mode === tab.key}
          data-testid={`auth-tab-${tab.key}`}
          className={cn(
            "flex h-11 items-center justify-center rounded-xl text-[14px] font-bold transition-[background-color,color] duration-300",
            mode === tab.key ? "cf-btn-volt" : "text-white/55 hover:text-white",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}

export function Heading({ icon, title, sub }: { icon?: typeof IconShield; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      {icon && <Emblem icon={icon} size="lg" className="mb-5" />}
      <h1 className="cf-headline text-[1.9rem] text-white sm:text-[2.2rem]" data-testid="auth-title">{title}</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/55">{sub}</p>
    </div>
  )
}

function LoginForm({ onForgot }: { onForgot: () => void }) {
  const { t } = useLanguage()
  const { busy, error, onSubmit } = useSubmit((f) => {
    const email = val(f, "login-email")
    const password = String(f.get("login-password") ?? "")
    return email && password ? loginUser(email, password) : missing()
  })
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" data-testid="auth-login-form">
      <FormError message={error} />
      <AuthField id="login-email" label={t("auth.email")} type="email" placeholder={t("auth.email.ph")} icon={Mail} autoComplete="email" />
      <AuthField id="login-password" label={t("auth.password")} type="password" placeholder={t("auth.password.ph")} icon={Lock} autoComplete="current-password" />
      <button type="button" onClick={onForgot} data-testid="auth-forgot-btn" className="-mt-1 self-end text-[13px] font-semibold text-[#CDFF17] transition-opacity hover:opacity-80">
        {t("auth.forgot")}
      </button>
      <SubmitButton label={t("auth.login.submit")} testId="auth-login-submit" busy={busy} />
    </form>
  )
}

function RegisterForm({ onForgot }: { onForgot: () => void }) {
  const { t } = useLanguage()
  const { busy, error, onSubmit } = useSubmit((f) => {
    const name = val(f, "register-name")
    const email = val(f, "register-email")
    const password = String(f.get("register-password") ?? "")
    return name && email && password ? registerUser(name, email, password) : missing()
  })
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" data-testid="auth-register-form">
      <FormError message={error} />
      <AuthField id="register-name" label={t("auth.name")} placeholder={t("auth.name.ph")} icon={User} autoComplete="name" />
      <AuthField id="register-email" label={t("auth.email")} type="email" placeholder={t("auth.email.ph")} icon={Mail} autoComplete="email" />
      <AuthField id="register-password" label={t("auth.password")} type="password" placeholder={t("auth.password.new.ph")} icon={Lock} autoComplete="new-password" />
      <SubmitButton label={t("auth.register.submit")} testId="auth-register-submit" busy={busy} />
      <button type="button" onClick={onForgot} data-testid="auth-forgot-btn" className="-mt-1 self-center text-[13px] font-semibold text-[#CDFF17] transition-opacity hover:opacity-80">
        {t("auth.forgot")}
      </button>
    </form>
  )
}

function ResetView({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage()
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const email = val(new FormData(e.currentTarget), "reset-email")
    setError("")
    if (!email) return setError(t("auth.err.fields"))
    setBusy(true)
    try {
      await sendResetEmail(email)
      setSent(true)
    } catch (err) {
      setError(t(authErrorKey(err)))
    }
    setBusy(false)
  }
  return (
    <div className="cf-rise flex flex-col gap-7" data-testid="auth-reset-view">
      {sent ? (
        <div data-testid="auth-reset-sent">
          <Heading icon={IconGemKey} title={t("auth.reset.sent.title")} sub={t("auth.reset.sent.sub")} />
        </div>
      ) : (
        <>
          <Heading icon={IconGemKey} title={t("auth.reset.title")} sub={t("auth.reset.sub")} />
          <form onSubmit={onSubmit} className="flex flex-col gap-5" data-testid="auth-reset-form">
            <FormError message={error} />
            <AuthField id="reset-email" label={t("auth.email")} type="email" placeholder={t("auth.email.ph")} icon={Mail} autoComplete="email" />
            <SubmitButton label={t("auth.reset.submit")} testId="auth-reset-submit" busy={busy} />
          </form>
        </>
      )}
      <button type="button" onClick={onBack} data-testid="auth-reset-back" className="inline-flex items-center justify-center gap-2 text-[13px] font-semibold text-white/60 transition-colors hover:text-[#CDFF17]">
        <ArrowLeft className="size-4" />
        {t("auth.reset.back")}
      </button>
    </div>
  )
}

export function AuthCard({ mode }: { mode: AuthMode }) {
  const { t } = useLanguage()
  const [reset, setReset] = useState(false)
  const isLogin = mode === "login"
  const router = useRouter()
  const user = useFirebaseUser()
  const [googleBusy, setGoogleBusy] = useState(false)
  const [googleError, setGoogleError] = useState("")
  useEffect(() => {
    if (user) router.replace("/profile")
  }, [user, router])

  // Completes a redirect-based Google sign-in (popup-blocked fallback).
  useEffect(() => {
    finishGoogleRedirect().catch(() => {})
  }, [])

  const onGoogle = async () => {
    setGoogleBusy(true)
    setGoogleError("")
    try {
      await loginWithGoogle()
      router.replace("/profile")
    } catch (err) {
      setGoogleError(t(authErrorKey(err)))
      setGoogleBusy(false)
    }
  }

  return (
    <div className="cf-card-strong cf-rise cf-d2 w-full max-w-[460px] rounded-[28px] p-6 sm:p-9" data-testid="auth-card">
      {reset ? (
        <ResetView onBack={() => setReset(false)} />
      ) : (
        <div key={mode} className="cf-rise flex flex-col gap-7">
          <Tabs mode={mode} />
          <Heading
            title={t(isLogin ? "auth.login.title" : "auth.register.title")}
            sub={t(isLogin ? "auth.login.sub" : "auth.register.sub")}
          />
          {isLogin ? <LoginForm onForgot={() => setReset(true)} /> : <RegisterForm onForgot={() => setReset(true)} />}
          <AuthDivider label={t("auth.or")} />
          <div className="flex flex-col gap-3">
            <FormError message={googleError} />
            <GoogleButton label={t("auth.google")} onClick={onGoogle} busy={googleBusy} />
          </div>
          <p className="text-center text-[13px] text-white/50">
            {t(isLogin ? "auth.switch.toRegister" : "auth.switch.toLogin")}{" "}
            <Link href={isLogin ? "/registration" : "/login"} data-testid="auth-switch-link" className="font-semibold text-[#CDFF17] hover:opacity-80">
              {t(isLogin ? "auth.tab.register" : "auth.tab.login")}
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}
