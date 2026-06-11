import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_AUTH_COOKIE_NAME,
  getAdminAuthConfig,
  sanitizeNextPath,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";
import { LoginForm } from "./LoginForm";

interface AdminLoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const config = getAdminAuthConfig();
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params?.next);

  if (!config.enabled) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_AUTH_COOKIE_NAME)?.value;

  if (verifyAdminSessionToken(sessionToken)) {
    redirect(nextPath);
  }

  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
