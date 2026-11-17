"use client";

import { useActionState, useState } from "react";
import { Icon, Spinner } from "@/components/icons";
import { loginAction, type LoginState } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [show, setShow] = useState(false);
  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="label" htmlFor="email">Email address</label>
        <input className="input" id="email" name="email" type="email" autoComplete="username" placeholder="name@company.com" required autoFocus />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <div className="relative">
          <input className="input pr-11" id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" required />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate hover:text-navy"
            aria-label={show ? "Hide password" : "Show password"}
          >
            <Icon name={show ? "eyeOff" : "eye"} className="h-5 w-5" />
          </button>
        </div>
      </div>
      {state.error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">{state.error}</p>
      ) : null}
      <button className="btn w-full py-3" disabled={pending}>
        {pending ? (<><Spinner /> Signing in</>) : (<>Sign in <Icon name="arrowRight" className="h-4 w-4" /></>)}
      </button>
    </form>
  );
}
