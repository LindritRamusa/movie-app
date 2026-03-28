import { EmailNotVerifiedError } from "@/services/auth";
import { AppwriteException } from "react-native-appwrite";

export type AppwriteErrorContext = "auth" | "otp" | "general";

export const formatAppwriteError = (
  error: unknown,
  context: AppwriteErrorContext = "general"
): string => {
  if (error instanceof EmailNotVerifiedError) {
    return "This email is not verified yet. Enter the code from your email on the register screen, or use Sign in after you have verified.";
  }
  if (error instanceof AppwriteException) {
    if (error.code === 429) {
      if (context === "otp") {
        return "Too many code attempts. Wait a minute, tap “Resend code”, then enter only the latest email.";
      }
      if (context === "auth") {
        return [
          "Your account is still there — it was not removed.",
          "",
          "Appwrite is temporarily limiting how often this app can sign in (rate limit). That happens after many taps in a short time, especially while testing. It is not the same as “wrong password”.",
          "",
          "Wait about 15–30 minutes, then open Sign in and try once. Until then, further attempts may keep showing this message.",
        ].join("\n");
      }
      return "Too many requests. Wait a few minutes and try again.";
    }
    if (error.code === 401) {
      if (context === "otp") {
        return [
          "That email code was not accepted (wrong, expired, or already used).",
          "",
          "This is not your account password — use the numbers from the email only.",
          "",
          "Tap “Resend code”, wait for the new email, then enter the latest code.",
        ].join("\n");
      }
      if (context === "auth") {
        const hint = `${error.type ?? ""} ${error.message}`.toLowerCase();
        if (
          hint.includes("verification") ||
          hint.includes("verify") ||
          hint.includes("unverified") ||
          hint.includes("not confirmed") ||
          hint.includes("user_unverified")
        ) {
          return "This email is not verified yet. Check your inbox for the verification code.";
        }
        return "Invalid email or password.";
      }
      return "Invalid email or password.";
    }
    if (error.code === 409) {
      return "This email is already registered. Use Sign in with the same password.";
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
};
