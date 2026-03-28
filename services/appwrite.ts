import { getPasswordRecoveryRedirectUrl } from "@/constants/appLinks";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Models } from "react-native-appwrite";
import {
  Account,
  AppwriteException,
  Client,
  Databases,
  ID,
  Query,
} from "react-native-appwrite";
import { Platform } from "react-native";

const FETCH_PATCH_FLAG = "__movieAppAppwriteFetchPatched";

function patchGlobalFetchForAppwriteJwt() {
  const globalAny = globalThis as Record<string, unknown>;
  if (globalAny[FETCH_PATCH_FLAG]) {
    return;
  }
  const originalFetch = global.fetch;
  if (typeof originalFetch !== "function") {
    return;
  }

  const getJwtHeader = (headers: HeadersInit | undefined): string | undefined => {
    if (!headers) {
      return undefined;
    }
    if (headers instanceof Headers) {
      const v = headers.get("X-Appwrite-JWT");
      return v && v.length > 0 ? v : undefined;
    }
    if (Array.isArray(headers)) {
      const row = headers.find(
        ([k]) => k.toLowerCase() === "x-appwrite-jwt"
      );
      return row?.[1];
    }
    const record = headers as Record<string, string>;
    const v =
      record["X-Appwrite-JWT"] ??
      record["x-appwrite-jwt"];
    return typeof v === "string" && v.length > 0 ? v : undefined;
  };

  global.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const jwt = getJwtHeader(init?.headers);
    if (jwt) {
      return originalFetch(input, { ...init, credentials: "omit" });
    }
    return originalFetch(input, init);
  }) as typeof fetch;

  globalAny[FETCH_PATCH_FLAG] = true;
}

patchGlobalFetchForAppwriteJwt();

const normalizeAuthEmail = (email: string) => email.trim().toLowerCase();

const SESSION_STORAGE_KEY = "@movie_app_appwrite_session";
const JWT_STORAGE_KEY = "@movie_app_appwrite_jwt";

const JWT_DURATION_SECONDS = 3600;

const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_ID!;

const ENDPOINT =
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? "https://cloud.appwrite.io/v1";
const PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "";
const PLATFORM =
  process.env.EXPO_PUBLIC_APPWRITE_PLATFORM ?? "com.jsm.movieapp";

export const appwriteClient = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setPlatform(PLATFORM);

export const account = new Account(appwriteClient);
export const databases = new Databases(appwriteClient);

type AppwriteClientInternals = {
  headers: Record<string, string | undefined>;
  config: { session: string; jwt: string };
};

const authClientInternals = () =>
  appwriteClient as unknown as AppwriteClientInternals;

const stripSessionAuthHeader = () => {
  const c = authClientInternals();
  delete c.headers["X-Appwrite-Session"];
  c.config.session = "";
};

const stripJwtAuthHeader = () => {
  const c = authClientInternals();
  delete c.headers["X-Appwrite-JWT"];
  c.config.jwt = "";
};

export const applySessionSecret = (secret: string) => {
  appwriteClient.setSession(secret);
};

export const loadStoredSessionSecret = () =>
  AsyncStorage.getItem(SESSION_STORAGE_KEY);

const loadStoredJwt = () => AsyncStorage.getItem(JWT_STORAGE_KEY);

const clearJwtStorage = async () => {
  await AsyncStorage.removeItem(JWT_STORAGE_KEY);
  stripJwtAuthHeader();
};

export const persistSessionSecret = async (secret: string) => {
  await clearJwtStorage();
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, secret);
  appwriteClient.setSession(secret);
};

const persistJwtAuth = async (jwt: string) => {
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  stripSessionAuthHeader();
  await AsyncStorage.setItem(JWT_STORAGE_KEY, jwt);
  appwriteClient.setJWT(jwt);
};

export const clearClientSession = async () => {
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  stripSessionAuthHeader();
};

let restoreSessionInFlight: Promise<Models.User | null> | null = null;

export const restoreUserSessionFromStorage = (): Promise<
  Models.User | null
> => {
  if (!restoreSessionInFlight) {
    restoreSessionInFlight = (async () => {
      try {
        const secret = await loadStoredSessionSecret();
        if (secret) {
          stripJwtAuthHeader();
          applySessionSecret(secret);
          try {
            const user = await account.get();
            if (!user.emailVerification) {
              await signOutAppwrite();
              return null;
            }
            return user;
          } catch {
            await clearClientSession();
          }
        }

        const jwt = await loadStoredJwt();
        if (jwt) {
          stripSessionAuthHeader();
          appwriteClient.setJWT(jwt);
          try {
            const user = await account.get();
            if (!user.emailVerification) {
              await signOutAppwrite();
              return null;
            }
            return user;
          } catch {
            await clearJwtStorage();
            return null;
          }
        }
        return null;
      } finally {
        restoreSessionInFlight = null;
      }
    })();
  }
  return restoreSessionInFlight;
};

const finalizeSessionAfterCreate = async (
  session: Models.Session
): Promise<Models.User> => {
  if (session.secret) {
    await persistSessionSecret(session.secret);
  }

  let user: Models.User;
  try {
    user = await account.get();
  } catch {
    throw new Error(
      "Could not load your profile after sign-in. Check the network and that Email/Password auth is enabled in Appwrite."
    );
  }

  if (!session.secret) {
    try {
      const jwt = await account.createJWT({ duration: JWT_DURATION_SECONDS });
      await persistJwtAuth(jwt.jwt);
    } catch {}
  }

  return user;
};

const postAppwriteAccountAnonymousJson = async <T>(
  apiPath: string,
  payload: Record<string, unknown>
): Promise<T> => {
  const baseUrl = ENDPOINT.replace(/\/$/, "");
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  const url = `${baseUrl}${path}`;

  const headerSource = authClientInternals().headers;
  const requestHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headerSource)) {
    if (value === undefined || value === "") {
      continue;
    }
    if (key === "X-Appwrite-Session" || key === "X-Appwrite-JWT") {
      continue;
    }
    requestHeaders[key] = value;
  }
  requestHeaders["content-type"] = "application/json";
  requestHeaders.Origin = `appwrite-${Platform.OS}://${PLATFORM}`;

  const response = await fetch(url, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(payload),
    credentials: "omit",
  });

  const text = await response.text();
  let data: { message?: string; type?: string; [key: string]: unknown } = {};
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json") && text.length > 0) {
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      data = { message: text };
    }
  } else if (text.length > 0) {
    data = { message: text };
  }

  if (response.status >= 400) {
    throw new AppwriteException(
      typeof data.message === "string" ? data.message : "Request failed",
      response.status,
      typeof data.type === "string" ? data.type : "",
      text
    );
  }

  return data as T;
};

const createEmailPasswordSessionWithoutStoredCookies = async (
  email: string,
  password: string
): Promise<Models.Session> => {
  return postAppwriteAccountAnonymousJson<Models.Session>(
    "/account/sessions/email",
    { email, password }
  );
};

const createSessionFromTokenWithoutStoredCookies = async (
  userId: string,
  secret: string
): Promise<Models.Session> => {
  return postAppwriteAccountAnonymousJson<Models.Session>(
    "/account/sessions/token",
    { userId, secret: secret.trim() }
  );
};

export const signInWithEmail = async (
  email: string,
  password: string
): Promise<Models.User> => {
  const normalizedEmail = normalizeAuthEmail(email);
  const passwordForAuth = password.replace(/\u200b/g, "").trimEnd();

  await clearJwtStorage();
  await clearClientSession();

  const session = await createEmailPasswordSessionWithoutStoredCookies(
    normalizedEmail,
    passwordForAuth
  );

  return finalizeSessionAfterCreate(session);
};

export interface CreateSessionFromEmailOtpOptions {
  omitStoredCookies?: boolean;
}

export const createSessionFromEmailOtp = async (
  userId: string,
  otp: string,
  options?: CreateSessionFromEmailOtpOptions
): Promise<Models.User> => {
  await clearJwtStorage();
  await clearClientSession();

  const trimmed = otp.trim();
  const session = options?.omitStoredCookies
    ? await createSessionFromTokenWithoutStoredCookies(userId, trimmed)
    : ((await account.createSession({
        userId,
        secret: trimmed,
      })) as Models.Session);

  return finalizeSessionAfterCreate(session);
};

export const signOutAppwrite = async () => {
  try {
    await account.deleteSessions();
  } catch {
    try {
      await account.deleteSession({ sessionId: "current" });
    } catch {}
  }
  await clearClientSession();
  await clearJwtStorage();
};

export const updateAccountName = async (name: string) => {
  await account.updateName({ name });
  return account.get();
};

export const updateAccountPassword = async (
  oldPassword: string,
  newPassword: string
): Promise<Models.User> => {
  return account.updatePassword({ password: newPassword, oldPassword });
};

export const updateAccountEmail = async (
  email: string,
  currentPassword: string
): Promise<Models.User> => {
  return account.updateEmail({
    email: normalizeAuthEmail(email),
    password: currentPassword,
  });
};

export interface EmailVerificationOtpResult {
  userId: string;
  otpSent: boolean;
}

export const sendEmailVerificationOtpToAddress = async (
  email: string
): Promise<EmailVerificationOtpResult> => {
  const normalized = normalizeAuthEmail(email);
  const me = await account.get();
  let sessionUserId = me.$id;
  let otpSent = false;
  try {
    const token = await account.createEmailToken({
      userId: me.$id,
      email: normalized,
    });
    if (token.userId) {
      sessionUserId = token.userId;
    }
    otpSent = true;
  } catch {}
  return { userId: sessionUserId, otpSent };
};

export const requestPasswordRecovery = async (email: string): Promise<void> => {
  const normalizedEmail = normalizeAuthEmail(email);
  await account.createRecovery({
    email: normalizedEmail,
    url: getPasswordRecoveryRedirectUrl(),
  });
};

export const completePasswordRecovery = async (
  userId: string,
  secret: string,
  password: string
): Promise<void> => {
  await account.updateRecovery({ userId, secret, password });
};

export const updateSearchCount = async (query: string, movie: Movie) => {
  const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
    Query.equal("searchTerm", query),
  ]);
  if (result.documents.length > 0) {
    const existingMovie = result.documents[0];
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_ID,
      existingMovie.$id,
      {
        count: existingMovie.count + 1,
      }
    );
  } else {
    await databases.createDocument(
      DATABASE_ID,
      COLLECTION_ID,
      ID.unique(),
      {
        searchTerm: query,
        movie_id: movie.id,
        count: 1,
        poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
        title: movie.title,
      }
    );
  }
};

export const getTrendingMovies = async (): Promise<TrendingMovie[]> => {
  try {
    const result = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
      Query.orderDesc("count"),
      Query.limit(5),
    ]);
    return result.documents as unknown as TrendingMovie[];
  } catch {
    return [];
  }
};
