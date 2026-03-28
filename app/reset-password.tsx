import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { MAX_PASSWORD_LEN, MIN_PASSWORD_LEN } from "@/constants/auth";
import { usePasswordRecovery } from "@/hooks/usePasswordRecovery";
import { formatSupabaseError } from "@/utils/supabaseErrors";
import { parseRecoveryTokensFromUrl } from "@/utils/authDeepLink";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const pickParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return typeof value === "string" ? value : "";
};

const ResetPassword = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    access_token?: string | string[];
    refresh_token?: string | string[];
  }>();
  const { completeRecovery } = usePasswordRecovery();

  const [linkedAt, setLinkedAt] = useState<{
    access_token: string;
    refresh_token: string;
  } | null>(null);

  useEffect(() => {
    const applyUrl = (url: string | null) => {
      if (!url) {
        return;
      }
      const parsed = parseRecoveryTokensFromUrl(url);
      if (parsed.access_token && parsed.refresh_token) {
        setLinkedAt({
          access_token: parsed.access_token,
          refresh_token: parsed.refresh_token,
        });
      }
    };

    void Linking.getInitialURL().then(applyUrl);
    const sub = Linking.addEventListener("url", ({ url }) => applyUrl(url));
    return () => sub.remove();
  }, []);

  const paramAccess = useMemo(
    () => pickParam(params.access_token),
    [params.access_token]
  );
  const paramRefresh = useMemo(
    () => pickParam(params.refresh_token),
    [params.refresh_token]
  );

  const accessToken = paramAccess || linkedAt?.access_token || "";
  const refreshToken = paramRefresh || linkedAt?.refresh_token || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleChangePassword = useCallback((text: string) => {
    setPassword(text);
  }, []);

  const handleChangeConfirm = useCallback((text: string) => {
    setConfirm(text);
  }, []);

  const handlePressSubmit = useCallback(async () => {
    if (!accessToken || !refreshToken) {
      setFormError(
        "This reset link is invalid or expired. Request a new one from sign in."
      );
      return;
    }
    if (password.length < MIN_PASSWORD_LEN) {
      setFormError(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
      return;
    }
    if (password.length > MAX_PASSWORD_LEN) {
      setFormError(`Password must be at most ${MAX_PASSWORD_LEN} characters.`);
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords do not match.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await completeRecovery(accessToken, refreshToken, password);
      Alert.alert("Password updated", "Sign in with your new password.", [
        { text: "OK", onPress: () => router.replace("/login") },
      ]);
    } catch (e) {
      setFormError(formatSupabaseError(e, "general"));
    } finally {
      setSubmitting(false);
    }
  }, [accessToken, refreshToken, password, confirm, completeRecovery, router]);

  const handlePressBack = useCallback(() => {
    router.replace("/login");
  }, [router]);

  const linkInvalid = !accessToken || !refreshToken;

  return (
    <SafeAreaView className="flex-1 bg-primary">
      <Image
        source={images.bg}
        className="absolute w-full h-full z-0"
        resizeMode="cover"
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={handlePressBack}
            className="flex-row items-center mt-2 mb-8 self-start"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Image
              source={icons.arrow}
              className="size-6 mr-2 rotate-180"
              tintColor="#fff"
            />
            <Text className="text-white text-base">Back to sign in</Text>
          </TouchableOpacity>

          <View className="flex-row items-center mb-8">
            <Image source={icons.logo} className="w-12 h-10 mr-4" />
            <Text className="text-3xl font-bold text-white">New password</Text>
          </View>

          {linkInvalid ? (
            <Text className="text-light-200 text-base leading-6 mb-6">
              Open the password reset link from your email on this device. If it
              expired, use Forgot password on the sign-in screen. Add your app
              redirect URL in Supabase Auth URL configuration.
            </Text>
          ) : (
            <>
              <Text className="text-light-200 text-sm mb-6">
                Choose a new password for your account.
              </Text>

              <Text className="text-light-200 text-sm mb-1">New password</Text>
              <TextInput
                className="bg-dark-100 text-white rounded-xl px-4 py-3 mb-4 border border-dark-200"
                value={password}
                onChangeText={handleChangePassword}
                placeholder={`At least ${MIN_PASSWORD_LEN} characters`}
                placeholderTextColor="#9CA4AB"
                secureTextEntry
                editable={!submitting}
                autoComplete="new-password"
              />

              <Text className="text-light-200 text-sm mb-1">Confirm password</Text>
              <TextInput
                className="bg-dark-100 text-white rounded-xl px-4 py-3 mb-4 border border-dark-200"
                value={confirm}
                onChangeText={handleChangeConfirm}
                placeholder="Repeat new password"
                placeholderTextColor="#9CA4AB"
                secureTextEntry
                editable={!submitting}
                autoComplete="new-password"
              />

              {formError ? (
                <Text className="text-red-400 text-sm mb-4">{formError}</Text>
              ) : null}

              <TouchableOpacity
                className="bg-accent py-3.5 rounded-xl items-center"
                onPress={() => void handlePressSubmit()}
                disabled={submitting || linkInvalid}
              >
                <Text className="text-white font-bold text-base">
                  {submitting ? "Saving…" : "Set password and continue"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ResetPassword;
