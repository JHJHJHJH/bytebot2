"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthStatusResponse {
  enabled: boolean;
  authenticated: boolean;
}

interface LoginResponse {
  authenticated?: boolean;
  redirectTo?: string;
  error?: string;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => sanitizeNextPath(searchParams.get("next")),
    [searchParams],
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/admin-auth/status")
      .then((res) => res.json() as Promise<AuthStatusResponse>)
      .then((status) => {
        if (!active) {
          return;
        }

        if (!status.enabled) {
          router.replace("/");
          return;
        }

        if (status.authenticated) {
          router.replace(nextPath);
        }
      })
      .catch(() => {
        if (active) {
          setError("Unable to check the current session.");
        }
      });

    return () => {
      active = false;
    };
  }, [nextPath, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          next: nextPath,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as LoginResponse;

      if (response.ok && data.authenticated) {
        router.replace(data.redirectTo || "/");
        router.refresh();
        return;
      }

      setError(data.error || "Invalid username or password");
    } catch {
      setError("Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="bg-bytebot-bronze-light-4 flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Image
            src="/bytebot_transparent_logo_dark.svg"
            alt="Bytebot"
            width={132}
            height={40}
            priority
            className="h-10 w-auto"
          />
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-bytebot-bronze-light-7 bg-bytebot-bronze-light-1 rounded-lg border p-6 shadow-sm"
        >
          <div className="mb-6">
            <h1 className="text-bytebot-bronze-light-12 text-xl font-semibold">
              Admin login
            </h1>
            <p className="text-bytebot-bronze-light-11 mt-1 text-sm">
              Sign in to continue to Bytebot.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-username">Username</Label>
              <Input
                id="admin-username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                aria-invalid={Boolean(error)}
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(error)}
                required
              />
            </div>
          </div>

          {error ? (
            <p className="text-bytebot-red-light-11 mt-4 text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="mt-6 w-full" disabled={isSubmitting}>
            <LogIn className="h-4 w-4" />
            {isSubmitting ? "Signing in" : "Sign in"}
          </Button>
        </form>
      </div>
    </main>
  );
}

function sanitizeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  try {
    const url = new URL(value, "http://bytebot.local");
    const nextPath = `${url.pathname}${url.search}${url.hash}`;

    if (!nextPath.startsWith("/") || nextPath.startsWith("/admin/login")) {
      return "/";
    }

    return nextPath || "/";
  } catch {
    return "/";
  }
}
