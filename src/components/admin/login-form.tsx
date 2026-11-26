"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api/reservations";
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const data = new FormData(e.currentTarget);
        try {
          await api("login", {
            email: data.get("email"),
            password: data.get("password"),
          });
          router.replace("/admin/dashboard/");
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Sign-in failed.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="field">
        Email address
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
        />
      </label>
      <label className="field">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="reservation-button" disabled={busy}>
        {busy ? "Signing in…" : "Sign in securely"}
      </button>
    </form>
  );
}
