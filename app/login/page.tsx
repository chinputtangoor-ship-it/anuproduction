"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/pages/Logo";
import { usernameToAuthEmail } from "@/lib/auth/email";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LangToggle } from "@/lib/i18n/LangToggle";
import { useI18n } from "@/lib/i18n/context";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const { t } = useI18n();
  const supabase = createClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showChangePw, setShowChangePw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !user.first_login) {
      router.replace("/dashboard");
    }
    if (!authLoading && user?.first_login) {
      setShowChangePw(true);
    }
  }, [authLoading, user, router]);

  async function handleLogin() {
    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: usernameToAuthEmail(username),
      password,
    });

    if (signInError) {
      setError(t("login.wrong_credential"));
      setLoading(false);
      return;
    }

    await refresh();
    setLoading(false);

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      setError(t("login.wrong_credential"));
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("must_change_password, is_active")
      .eq("id", authUser.id)
      .single();

    if (!profile?.is_active) {
      await supabase.auth.signOut();
      setError(t("login.wrong_credential"));
      return;
    }

    if (profile.must_change_password) {
      setShowChangePw(true);
      return;
    }

    router.push("/dashboard");
  }

  async function handleChangePassword() {
    setPwError("");
    if (newPw.length < 6) {
      setPwError(t("login.err_too_short"));
      return;
    }
    if (newPw !== confirmPw) {
      setPwError(t("login.err_not_match"));
      return;
    }

    setPwSaving(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPw, confirm: confirmPw }),
    });
    const data = await res.json();

    if (!res.ok) {
      setPwError(data.error ?? t("login.err_save_failed"));
      setPwSaving(false);
      return;
    }

    await refresh();
    setPwSaving(false);
    router.push("/dashboard");
  }

  const inputCls = "rounded-lg border px-3 py-2.5 text-sm outline-none transition w-full";
  const inputSty = {
    background: "var(--color-anu-elevated)",
    borderColor: "var(--color-anu-border)",
    color: "var(--color-anu-text)",
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
        <LangToggle />
      </div>

      {showChangePw && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "var(--color-anu-overlay)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border p-6 flex flex-col gap-4"
            style={{ background: "var(--color-anu-surface)", borderColor: "var(--color-anu-glow)" }}
          >
            <div className="text-center">
              <p className="text-2xl mb-1">🔐</p>
              <h2 className="text-base font-bold" style={{ color: "var(--color-anu-text)" }}>
                {t("login.change_pw_title")}
              </h2>
              <p className="text-xs mt-1" style={{ color: "var(--color-anu-muted)" }}>
                {user?.username ?? username}{" "}
                {t("login.change_pw_subtitle")}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--color-anu-muted)" }}>
                {t("login.new_password")}
              </label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                placeholder={t("login.new_password_hint")}
                className={inputCls}
                style={inputSty}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--color-anu-muted)" }}>
                {t("login.confirm_password")}
              </label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                placeholder={t("login.confirm_hint")}
                className={inputCls}
                style={inputSty}
              />
            </div>

            {pwError && (
              <p className="text-xs text-center" style={{ color: "var(--color-anu-danger)" }}>
                {pwError}
              </p>
            )}

            <button
              onClick={handleChangePassword}
              disabled={pwSaving || !newPw || !confirmPw}
              className="rounded-lg py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--color-anu-accent)", color: "#fff" }}
            >
              {pwSaving ? t("login.saving_pw") : t("login.save_pw")}
            </button>

            <p className="text-xs text-center" style={{ color: "var(--color-anu-muted)" }}>
              {t("login.cannot_skip")}
            </p>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <Logo className="w-14 h-14" />
          <div className="text-center">
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ color: "var(--color-anu-glow)" }}
            >
              ANU Production
            </p>
            <h1 className="text-2xl font-bold" style={{ color: "var(--color-anu-text)" }}>
              ANU
            </h1>
          </div>
        </div>

        <div
          className="rounded-xl border p-6 flex flex-col gap-4"
          style={{ background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--color-anu-muted)" }}>
              {t("login.username")}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className={inputCls}
              style={inputSty}
              placeholder="username"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--color-anu-muted)" }}>
              {t("login.password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className={inputCls}
              style={inputSty}
              placeholder="password"
            />
          </div>

          {error && (
            <p className="text-xs text-center" style={{ color: "var(--color-anu-danger)" }}>
              {error}
            </p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="mt-1 rounded-lg py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--color-anu-accent)", color: "#fff" }}
          >
            {loading ? t("login.logging_in") : t("login.login_btn")}
          </button>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--color-anu-muted)" }}>
          {t("login.version")}
        </p>
      </div>
    </main>
  );
}
