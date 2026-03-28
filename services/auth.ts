import type { Models } from "react-native-appwrite";
import { AppwriteException, ID } from "react-native-appwrite";
import {
  account,
  createSessionFromEmailOtp,
  signInWithEmail,
  signOutAppwrite,
} from "@/services/appwrite";
import {
  clearPendingVerificationCreds,
  savePendingVerificationCreds,
} from "@/services/pendingVerificationCreds";

export class EmailNotVerifiedError extends Error {
  readonly email: string;

  constructor(email: string) {
    super("EMAIL_NOT_VERIFIED");
    this.name = "EmailNotVerifiedError";
    this.email = email;
  }
}

export type RegisterResult =
  | { kind: "signed_in"; user: Models.User }
  | {
      kind: "awaiting_otp";
      email: string;
      userId: string;
      otpSent: boolean;
    };

const normalizeAuthEmail = (email: string) => email.trim().toLowerCase();

const isEmailAlreadyRegistered = (error: unknown): boolean => {
  if (!(error instanceof AppwriteException)) {
    return false;
  }
  if (error.code === 409) {
    return true;
  }
  const t = error.type?.toLowerCase() ?? "";
  if (t.includes("user_already_exists") || t.includes("duplicate")) {
    return true;
  }
  const msg = error.message?.toLowerCase() ?? "";
  return msg.includes("already") && msg.includes("exist");
};

const isLikelyUnverifiedAuthFailure = (error: unknown): boolean => {
  if (!(error instanceof AppwriteException)) {
    return false;
  }
  if (error.code !== 401 && error.code !== 403) {
    return false;
  }
  const hint = `${error.type ?? ""} ${error.message}`.toLowerCase();
  return (
    hint.includes("verification") ||
    hint.includes("verify") ||
    hint.includes("not confirmed") ||
    hint.includes("unverified") ||
    hint.includes("confirm your") ||
    hint.includes("email verification") ||
    hint.includes("user_unverified")
  );
};

export const signInExistingUser = async (
  email: string,
  password: string
): Promise<Models.User> => {
  const normalizedEmail = normalizeAuthEmail(email);
  try {
    const user = await signInWithEmail(normalizedEmail, password);
    if (!user.emailVerification) {
      await signOutAppwrite();
      throw new EmailNotVerifiedError(normalizedEmail);
    }
    return user;
  } catch (e) {
    if (e instanceof EmailNotVerifiedError) {
      throw e;
    }
    if (isLikelyUnverifiedAuthFailure(e)) {
      try {
        await signOutAppwrite();
      } catch {}
      throw new EmailNotVerifiedError(normalizedEmail);
    }
    throw e;
  }
};

export const registerWithVerificationFlow = async (
  name: string,
  email: string,
  password: string
): Promise<RegisterResult> => {
  const normalizedEmail = normalizeAuthEmail(email);

  try {
    const created = await account.create({
      userId: ID.unique(),
      email: normalizedEmail,
      password,
      name,
    });

    let otpSent = false;
    let sessionUserId = created.$id;
    try {
      const token = await account.createEmailToken({
        userId: created.$id,
        email: normalizedEmail,
      });
      if (token.userId) {
        sessionUserId = token.userId;
      }
      otpSent = true;
    } catch {}

    await savePendingVerificationCreds(
      normalizedEmail,
      password,
      sessionUserId
    );

    return {
      kind: "awaiting_otp",
      email: normalizedEmail,
      userId: sessionUserId,
      otpSent,
    };
  } catch (e) {
    if (isEmailAlreadyRegistered(e)) {
      const user = await signInExistingUser(normalizedEmail, password);
      await clearPendingVerificationCreds();
      return { kind: "signed_in", user };
    }
    throw e;
  }
};

export const resendRegistrationEmailOtp = async (
  email: string,
  userId: string
): Promise<boolean> => {
  const normalizedEmail = normalizeAuthEmail(email);
  try {
    await account.createEmailToken({
      userId,
      email: normalizedEmail,
    });
    return true;
  } catch {
    return false;
  }
};

export const completeRegistrationWithEmailOtp = async (
  userId: string,
  otp: string
): Promise<Models.User> => {
  const trimmed = otp.trim();
  if (!trimmed) {
    throw new Error("Enter the code from your email.");
  }

  const user = await createSessionFromEmailOtp(userId, trimmed);
  if (!user.emailVerification) {
    await signOutAppwrite();
    throw new EmailNotVerifiedError(normalizeAuthEmail(user.email));
  }
  await clearPendingVerificationCreds();
  return user;
};

export const completeEmailChangeWithOtp = async (
  userId: string,
  otp: string
): Promise<Models.User> => {
  const trimmed = otp.trim();
  if (!trimmed) {
    throw new Error("Enter the code from your email.");
  }
  const user = await createSessionFromEmailOtp(userId, trimmed, {
    omitStoredCookies: true,
  });
  if (!user.emailVerification) {
    await signOutAppwrite();
    throw new EmailNotVerifiedError(normalizeAuthEmail(user.email));
  }
  return user;
};
