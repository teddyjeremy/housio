"use client";

import { useActionState } from "react";
import { login, register, type AuthState } from "@/app/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <label className="block"><span className="label">Email</span><input name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} className="input" /></label>
      <label className="block"><span className="label">Password</span><input name="password" type="password" autoComplete="current-password" required className="input" /></label>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <button className="btn btn-primary w-full py-3" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

export function RegisterForm({ role, next }: { role: "guest" | "owner"; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(register, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <fieldset>
        <legend className="label">I want to</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm"><input type="radio" name="role" value="guest" defaultChecked={role === "guest"} className="accent-forest" /> Book stays</label>
          <label className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm"><input type="radio" name="role" value="owner" defaultChecked={role === "owner"} className="accent-forest" /> List my property</label>
        </div>
      </fieldset>
      <label className="block"><span className="label">Full name</span><input name="name" autoComplete="name" required defaultValue={state.values?.name} className="input" /></label>
      <label className="block"><span className="label">Email</span><input name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} className="input" /></label>
      <label className="block"><span className="label">Password (10+ characters)</span><input name="password" type="password" autoComplete="new-password" minLength={10} required className="input" /></label>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <button className="btn btn-primary w-full py-3" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
      <p className="text-xs text-muted">By creating an account you agree to the <a href="/terms" className="underline">terms</a> and <a href="/privacy" className="underline">privacy notice</a>.</p>
    </form>
  );
}
