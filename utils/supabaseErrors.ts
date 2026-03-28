import { EmailNotVerifiedError } from "@/services/auth";
import type { AuthError } from "@supabase/supabase-js";

export type SupabaseErrorContext = "auth" | "otp" | "general";

const isAuthError = (error: unknown): error is AuthError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as AuthError).message === "string"
  );
};

export const formatSupabaseError = (
  error: unknown,
  context: SupabaseErrorContext = "general"
): string => {
  if (error instanceof EmailNotVerifiedError) {
    return "Confirm your email first. Check your inbox for the confirmation link, then sign in.";
  }
  if (isAuthError(error)) {
    const msg = error.message.toLowerCase();
    const status = (error as AuthError & { status?: number }).status;

    if (status === 429 || msg.includes("rate limit") || msg.includes("too many")) {
      if (context === "otp") {
        return "Too many attempts. Wait a minute, then tap Resend and use only the latest email.";
      }
      if (context === "auth") {
        return "Too many sign-in attempts. Wait 15–30 minutes, then try again once.";
      }
      return "Too many requests. Wait a few minutes and try again.";
    }

    if (
      msg.includes("invalid login") ||
      msg.includes("invalid credentials") ||
      msg.includes("wrong password") ||
      status === 400
    ) {
      if (context === "auth") {
        return "Invalid email or password.";
      }
    }

    if (
      msg.includes("email not confirmed") ||
      msg.includes("not confirmed") ||
      msg.includes("email_not_confirmed")
    ) {
      return "Confirm your email first. Check your inbox for the confirmation link, then sign in.";
    }

    if (msg.includes("already registered") || msg.includes("already been registered")) {
      return "This email is already registered. Use Sign in with the same password.";
    }

    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
};
