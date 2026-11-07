"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useState, type FormEvent } from "react"
import { Loader2, Lock } from "lucide-react"

import { authErrorKey, checkResetCode, setNewPassword } from "@/lib/user-auth"
import { useLanguage } from "@/components/language-provider"
import { WarningCircle } from "@phosphor-icons/react"

import { IconGemKey, IconShield } from "@/components/home/icons"
import { AuthField, SubmitButton } from "@/components/auth/auth-fields"
import { FormError, Heading } from "@/components/auth/auth-card"

const BadIcon = (p: { className?: string }) => <WarningCircle weight="duotone" className={p.className} />

type Stage = "checking" | "form" | "done" | "bad"

function LoginLink() {
  const { t } = useLanguage()
  return (
    <Link href="/login" data-testid="newpw-login-link" className="cf-btn-volt inline-flex h-13 w-full items-center justify-center rounded-xl px-6 text-[15px] font-bold">
      {t("auth.newpw.login")}
    </Link>
  )
}

function useResetCode() {
  const params = useSearchParams()
  const code = params.get("oobCode") ?? ""
  const [stage, setStage] = useState<Stage>("checking")
  const [email, setEmail] = useState("")
  useEffect(() => {
    if (params.get("mode") !== "resetPassword" || !code) return setStage("bad")
    checkResetCode(code)
      .then((e) => { setEmail(e); setStage("form") })
      .catch(() => setStage("bad"))
  }, [code, params])
  return { code, email, stage, setStage }
}

export function NewPasswordCard() {
  const { t } = useLanguage()
  const { code, email, stage, setStage } = useResetCode()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const password = String(new FormData(e.currentTarget).get("new-password") ?? "")
    setError("")
    if (!password) return setError(t("auth.err.fields"))
    setBusy(true)
    try {
      await setNewPassword(code, password)
      setStage("done")
    } catch (err) {
      const c = (err as { code?: string })?.code ?? ""
      if (["auth/expired-action-code", "auth/invalid-action-code"].includes(c)) setStage("bad")
      else setError(t(authErrorKey(err)))
    }
    setBusy(false)
  }

  return (
    <div className="cf-card-strong cf-rise cf-d2 w-full max-w-[460px] rounded-[28px] p-6 sm:p-9" data-testid="newpw-card">
      {stage === "checking" && (
        <p className="flex items-center justify-center gap-3 py-10 text-sm text-white/60" data-testid="newpw-checking">
          <Loader2 className="size-5 animate-spin text-[#CDFF17]" /> {t("auth.newpw.checking")}
        </p>
      )}
      {stage === "form" && (
        <div className="flex flex-col gap-7" data-testid="newpw-form-view">
          <Heading icon={IconGemKey} title={t("auth.newpw.title")} sub={`${t("auth.newpw.sub")} ${email}`} />
          <form onSubmit={onSubmit} className="flex flex-col gap-5" data-testid="newpw-form">
            <FormError message={error} />
            <AuthField id="new-password" label={t("auth.newpw.label")} type="password" placeholder={t("auth.password.new.ph")} icon={Lock} autoComplete="new-password" />
            <SubmitButton label={t("auth.newpw.submit")} testId="newpw-submit" busy={busy} />
          </form>
        </div>
      )}
      {(stage === "done" || stage === "bad") && (
        <div className="flex flex-col gap-7" data-testid={`newpw-${stage}`}>
          <Heading icon={stage === "bad" ? BadIcon : IconShield} title={t(`auth.newpw.${stage}.title`)} sub={t(`auth.newpw.${stage}.sub`)} />
          <LoginLink />
        </div>
      )}
    </div>
  )
}
