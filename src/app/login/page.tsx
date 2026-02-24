"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin || cooldown > 0 || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/");
        router.refresh();
        return;
      }

      if (data.cooldown) {
        setCooldown(data.cooldown);
      }

      setPin("");
      setError(res.status === 429 ? "Too many attempts" : "Incorrect code");
    } catch {
      setError("Connection error");
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = cooldown > 0 || submitting;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
            Provider Lead Engine
          </h1>
          <p className="mt-1 text-xs text-zinc-500">Enter access code</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* PIN boxes */}
          <div
            className="relative mx-auto mb-6 flex w-fit cursor-text justify-center gap-2"
            onClick={() => inputRef.current?.focus()}
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`flex h-12 w-10 items-center justify-center rounded-lg border transition-colors duration-200 ${
                  i === pin.length && !disabled
                    ? "border-indigo-500/50 bg-zinc-900/70"
                    : "border-zinc-700 bg-zinc-900/50"
                }`}
              >
                {pin[i] ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
                ) : null}
              </div>
            ))}
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                if (!disabled) {
                  setPin(e.target.value.replace(/[^0-9a-zA-Z]/g, ""));
                  setError("");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit(e);
              }}
              className="absolute inset-0 opacity-0"
              autoFocus
              autoComplete="off"
            />
          </div>

          {/* Error / cooldown */}
          <div className="mb-4 h-5 text-center">
            {cooldown > 0 ? (
              <p className="text-xs text-amber-400">
                Wait {cooldown}s before trying again
              </p>
            ) : error ? (
              <p className="text-xs text-red-400">{error}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={!pin || disabled}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Verifying
              </span>
            ) : (
              "Unlock"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
