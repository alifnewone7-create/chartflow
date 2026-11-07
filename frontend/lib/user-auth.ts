"use client"

import {
  GoogleAuthProvider,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  getRedirectResult,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth"

import { getFirebaseAuth } from "@/lib/firebase"

export async function saveProfile(user: User, name: string) {
  const res = await fetch("/api/account", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error("profile-save-failed")
}

export async function registerUser(name: string, email: string, password: string) {
  const { user } = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password)
  await updateProfile(user, { displayName: name })
  await saveProfile(user, name)
}

export async function loginUser(email: string, password: string) {
  await signInWithEmailAndPassword(getFirebaseAuth(), email, password)
}

export const logoutUser = () => signOut(getFirebaseAuth())

export async function sendResetEmail(email: string) {
  try {
    await sendPasswordResetEmail(getFirebaseAuth(), email, { url: `${window.location.origin}/login` })
  } catch (err) {
    const code = (err as { code?: string })?.code ?? ""
    // Domain not yet whitelisted in Firebase: send without the "Continue" back-link.
    if (code === "auth/unauthorized-continue-uri") return sendPasswordResetEmail(getFirebaseAuth(), email)
    // Don't reveal whether an account exists.
    if (code !== "auth/user-not-found") throw err
  }
}

export const checkResetCode = (code: string) => verifyPasswordResetCode(getFirebaseAuth(), code)

export const setNewPassword = (code: string, password: string) => confirmPasswordReset(getFirebaseAuth(), code, password)

function googleProvider() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: "select_account" })
  return provider
}

/** Continue with Google. Falls back to a full-page redirect when popups are blocked. */
export async function loginWithGoogle() {
  const auth = getFirebaseAuth()
  try {
    const { user } = await signInWithPopup(auth, googleProvider())
    await saveProfile(user, user.displayName || (user.email ?? "").split("@")[0] || "Trader")
  } catch (err) {
    const code = (err as { code?: string })?.code ?? ""
    if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/cancelled-popup-request"].includes(code)) {
      await signInWithRedirect(auth, googleProvider())
      return
    }
    throw err
  }
}

/** Completes a redirect-based Google sign-in after the page reloads. */
export async function finishGoogleRedirect(): Promise<boolean> {
  const result = await getRedirectResult(getFirebaseAuth())
  if (!result?.user) return false
  const { user } = result
  await saveProfile(user, user.displayName || (user.email ?? "").split("@")[0] || "Trader")
  return true
}

/** Maps a Firebase error to a dictionary key. */
export function authErrorKey(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ""
  if (code === "fields") return "auth.err.fields"
  if (code === "auth/email-already-in-use") return "auth.err.emailInUse"
  if (code === "auth/invalid-email") return "auth.err.invalidEmail"
  if (code === "auth/weak-password") return "auth.err.weakPassword"
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(code)) return "auth.err.wrongCredentials"
  if (code === "auth/too-many-requests") return "auth.err.tooMany"
  if (code === "auth/network-request-failed") return "auth.err.network"
  if (["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(code)) return "auth.err.popupClosed"
  if (code === "auth/account-exists-with-different-credential") return "auth.err.accountExists"
  if (code === "auth/unauthorized-domain") return "auth.err.unauthorizedDomain"
  return "auth.err.generic"
}
