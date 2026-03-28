import type { AuthProfile } from "@/types/auth-profile";
import type {
  Session,
  User as SupabaseUser,
} from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { supabase } from "@/services/supabase";

export class EmailNotVerifiedError extends Error {
  readonly email: string;

  constructor(email: string) {
    super("EMAIL_NOT_VERIFIED");
    this.name = "EmailNotVerifiedError";
    this.email = email;
  }
}

export type RegisterResult =
  | { kind: "signed_in"; user: AuthProfile }
  | { kind: "awaiting_otp"; email: string; name: string; otpSent: boolean };

const normalizeAuthEmail = (email: string) => email.trim().toLowerCase();

const signupOtpData = (name: string) => ({
  full_name: name.trim(),
  name: name.trim(),
});

const toAuthProfile = (u: SupabaseUser): AuthProfile => {
  const meta = u.user_metadata as Record<string, unknown> | undefined;
  const fromMeta =
    (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta?.name === "string" && meta.name.trim()) ||
    "";
  return {
    id: u.id,
    email: u.email ?? "",
    name: fromMeta,
    emailVerified: !!u.email_confirmed_at,
  };
};

const isEmailNotConfirmedError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return false;
  }
  const msg = String((error as { message: string }).message).toLowerCase();
  return (
    msg.includes("email not confirmed") ||
    msg.includes("not confirmed") ||
    msg.includes("email_not_confirmed")
  );
};

const sendSignupEmailOtp = async (
  name: string,
  email: string
): Promise<void> => {
  const normalizedEmail = normalizeAuthEmail(email);
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: Linking.createURL("/"),
      data: signupOtpData(name),
    },
  });
  if (error) {
    throw error;
  }
};

export const signInExistingUser = async (
  email: string,
  password: string
): Promise<AuthProfile> => {
  const normalizedEmail = normalizeAuthEmail(email);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    if (isEmailNotConfirmedError(error)) {
      throw new EmailNotVerifiedError(normalizedEmail);
    }
    throw error;
  }

  if (!data.user) {
    throw new Error("Sign in failed.");
  }

  const profile = toAuthProfile(data.user);
  if (!profile.emailVerified) {
    await supabase.auth.signOut();
    throw new EmailNotVerifiedError(normalizedEmail);
  }

  return profile;
};

export const registerWithVerificationFlow = async (
  name: string,
  email: string,
  password: string
): Promise<RegisterResult> => {
  const normalizedEmail = normalizeAuthEmail(email);

  const { data: existing, error: signErr } =
    await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

  if (!signErr && existing.user) {
    const profile = toAuthProfile(existing.user);
    if (profile.emailVerified) {
      return { kind: "signed_in", user: profile };
    }
    await supabase.auth.signOut();
  }

  await sendSignupEmailOtp(name, normalizedEmail);

  return {
    kind: "awaiting_otp",
    email: normalizedEmail,
    name: name.trim(),
    otpSent: true,
  };
};

export const completeRegistrationWithEmailOtp = async (
  email: string,
  name: string,
  password: string,
  otp: string
): Promise<AuthProfile> => {
  const trimmed = otp.trim();
  if (!trimmed) {
    throw new Error("Enter the code from your email.");
  }
  const normalizedEmail = normalizeAuthEmail(email);

  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: trimmed,
    type: "email",
  });

  if (error || !data.user) {
    throw error ?? new Error("Verification failed.");
  }

  const { data: updated, error: pwErr } = await supabase.auth.updateUser({
    password,
    data: signupOtpData(name),
  });

  if (pwErr || !updated.user) {
    throw pwErr ?? new Error("Could not set password.");
  }

  return toAuthProfile(updated.user);
};

export const resendSignupConfirmationEmail = async (
  email: string,
  name: string
): Promise<boolean> => {
  try {
    await sendSignupEmailOtp(name, email);
    return true;
  } catch {
    return false;
  }
};

export const updateAccountDisplayName = async (
  name: string
): Promise<AuthProfile> => {
  const trimmed = name.trim();
  const { data, error } = await supabase.auth.updateUser({
    data: { full_name: trimmed, name: trimmed },
  });
  if (error || !data.user) {
    throw error ?? new Error("Could not update name.");
  }
  return toAuthProfile(data.user);
};

export const updateAccountPasswordReauthed = async (
  oldPassword: string,
  newPassword: string
): Promise<AuthProfile> => {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user?.email) {
    throw userErr ?? new Error("Not signed in.");
  }
  const { error: signErr } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: oldPassword,
  });
  if (signErr) {
    throw signErr;
  }
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error || !data.user) {
    throw error ?? new Error("Could not update password.");
  }
  return toAuthProfile(data.user);
};

export const startEmailChangeWithReauth = async (
  newEmail: string,
  currentPassword: string
): Promise<void> => {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user?.email) {
    throw userErr ?? new Error("Not signed in.");
  }
  const { error: signErr } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: currentPassword,
  });
  if (signErr) {
    throw signErr;
  }
  const { error } = await supabase.auth.updateUser({
    email: normalizeAuthEmail(newEmail),
  });
  if (error) {
    throw error;
  }
};

export type CompleteEmailChangeOtpResult =
  | { kind: "completed"; profile: AuthProfile }
  | { kind: "awaiting_second_factor" };

const isAwaitingSecondEmailChangeFactor = (
  session: Session | null,
  user: unknown
): boolean => {
  if (session?.access_token) {
    return false;
  }
  if (typeof user !== "object" || user === null || !("msg" in user)) {
    return false;
  }
  const msg = (user as { msg: unknown }).msg;
  if (typeof msg !== "string") {
    return false;
  }
  return msg.toLowerCase().includes("other email");
};

const isSupabaseUserRecord = (user: unknown): user is SupabaseUser => {
  if (typeof user !== "object" || user === null || !("id" in user)) {
    return false;
  }
  return typeof (user as { id: unknown }).id === "string";
};

export const completeEmailChangeWithOtp = async (
  newEmail: string,
  otp: string
): Promise<CompleteEmailChangeOtpResult> => {
  const trimmed = otp.trim();
  if (!trimmed) {
    throw new Error("Enter the code from your email.");
  }
  const normalized = normalizeAuthEmail(newEmail);
  const { data, error } = await supabase.auth.verifyOtp({
    email: normalized,
    token: trimmed,
    type: "email_change",
  });
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("Could not verify email change.");
  }

  if (isAwaitingSecondEmailChangeFactor(data.session, data.user)) {
    return { kind: "awaiting_second_factor" };
  }

  if (!data.session?.access_token || !isSupabaseUserRecord(data.user)) {
    throw new Error("Could not verify email change.");
  }

  const fromVerify = toAuthProfile(data.user);
  const { data: fresh, error: freshErr } = await supabase.auth.getUser();
  const fromServer =
    !freshErr && fresh.user ? toAuthProfile(fresh.user) : fromVerify;
  const profile: AuthProfile = {
    ...fromServer,
    email: fromServer.email || fromVerify.email || normalized,
    name: fromServer.name || fromVerify.name,
  };
  return { kind: "completed", profile };
};

export const resendEmailChangeOtp = async (newEmail: string): Promise<boolean> => {
  const { error } = await supabase.auth.resend({
    type: "email_change",
    email: normalizeAuthEmail(newEmail),
  });
  return !error;
};
