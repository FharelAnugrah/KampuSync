"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Eye, EyeOff, GraduationCap, Loader2, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form-controls";
import { FeedbackAlert } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [capsLockOn, setCapsLockOn] = React.useState(false);
  const [demoFlash, setDemoFlash] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  function handlePasswordKeyCheck(e) {
    if (typeof e.getModifierState === "function") {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  }

  function fillDemoAccount(demoId) {
    setIdentifier(demoId);
    setPassword("Kampusync123!");
    setError(null);
    setDemoFlash(true);
    setTimeout(() => setDemoFlash(false), 600);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password) {
      setError("Masukkan email/NIM/NIDN dan kata sandi.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Gagal masuk ke portal.");
        return;
      }
      router.push(json.data.redirectTo);
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="portal-page-enter w-full max-w-md">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#2457A6] text-white shadow-sm">
          <GraduationCap className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#172033]">
          Masuk ke Kampusync
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          One Campus, Connected Academics.
        </p>
      </div>

      <div
        className={cn(
          "rounded-2xl border bg-white p-6 shadow-sm transition-colors duration-300 sm:p-8",
          demoFlash ? "border-[#2457A6] ring-2 ring-[#2457A6]/15" : "border-[#E2E8F0]"
        )}
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error ? (
            <FeedbackAlert
              type="error"
              message={error}
              onDismiss={() => setError(null)}
            />
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="identifier" required>
              Email / NIM / NIDN
            </Label>
            <div className="relative">
              <User
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#64748B]"
                aria-hidden="true"
              />
              <Input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                placeholder="nama@kampusync.ac.id atau 2024101001"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="pl-9"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" required>
              Kata Sandi
            </Label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#64748B]"
                aria-hidden="true"
              />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handlePasswordKeyCheck}
                onKeyUp={handlePasswordKeyCheck}
                onBlur={() => setCapsLockOn(false)}
                className="pl-9 pr-10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                }
                className="absolute right-2.5 top-2 rounded p-1 text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#172033]"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {capsLockOn ? (
              <p
                role="status"
                className="alert-reveal flex items-center gap-1.5 text-xs font-medium text-[#B7791F]"
              >
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Caps Lock sedang aktif.
              </p>
            ) : null}
          </div>

          <Button type="submit" className="h-10 w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                Memverifikasi...
              </>
            ) : (
              "Masuk ke Portal"
            )}
          </Button>
        </form>

        <div className="mt-6 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-xs text-[#475569]">
          <p className="font-semibold text-[#172033]">
            Akun Demo Sintetis (Password: Kampusync123!)
          </p>
          <ul className="mt-1.5 space-y-1">
            <li>
              <span className="font-medium text-[#172033]">Admin:</span>{" "}
              <button
                type="button"
                onClick={() => fillDemoAccount("admin@kampusync.ac.id")}
                className="text-[#2457A6] underline-offset-2 hover:underline"
              >
                admin@kampusync.ac.id
              </button>
            </li>
            <li>
              <span className="font-medium text-[#172033]">Dosen & Wali:</span>{" "}
              <button
                type="button"
                onClick={() => fillDemoAccount("ahmad.fauzi@kampusync.ac.id")}
                className="text-[#2457A6] underline-offset-2 hover:underline"
              >
                ahmad.fauzi@kampusync.ac.id
              </button>
            </li>
            <li>
              <span className="font-medium text-[#172033]">Mahasiswa:</span>{" "}
              <button
                type="button"
                onClick={() => fillDemoAccount("2024101001")}
                className="text-[#2457A6] underline-offset-2 hover:underline"
              >
                2024101001 (Nadia Putri)
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
