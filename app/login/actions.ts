"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  checkPassword,
  checkTotpCode,
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/core/auth";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");

  if (!checkPassword(password)) {
    redirect(`/login?error=password&from=${encodeURIComponent(redirectTo)}`);
  }

  if (!checkTotpCode(code)) {
    redirect(`/login?error=code&from=${encodeURIComponent(redirectTo)}`);
  }

  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });

  redirect(redirectTo);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
