import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { usePasswordRecovery } from "@/hooks/usePasswordRecovery";
import { formatSupabaseError } from "@/utils/supabaseErrors";
import { Link, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
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

const ForgotPassword = () => {
  const router = useRouter();
  const { requestRecovery } = usePasswordRecovery();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleChangeEmail = useCallback((text: string) => {
    setEmail(text);
  }, []);

  const handlePressSubmit = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setFormError("Enter your account email.");
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await requestRecovery(trimmed);
      setSent(true);
    } catch (e) {
      setFormError(formatSupabaseError(e, "general"));
    } finally {
      setSubmitting(false);
    }
  }, [email, requestRecovery]);

  const handlePressBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/login");
    }
  }, [router]);

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
            <Text className="text-white text-base">Back</Text>
          </TouchableOpacity>

          <View className="flex-row items-center mb-8">
            <Image source={icons.logo} className="w-12 h-10 mr-4" />
            <Text className="text-3xl font-bold text-white">Forgot password</Text>
          </View>

          {sent ? (
            <View>
              <Text className="text-light-200 text-base leading-6 mb-6">
                If an account exists for that email, we sent a reset link. Open it
                on this device to choose a new password. The link expires in
                about one hour.
              </Text>
              <Link href="/login" asChild>
                <TouchableOpacity className="bg-accent py-3.5 rounded-xl items-center">
                  <Text className="text-white font-bold text-base">Back to sign in</Text>
                </TouchableOpacity>
              </Link>
            </View>
          ) : (
            <>
              <Text className="text-light-200 text-sm mb-6">
                Enter the email you used to register. We will send a reset link if
                the account exists.
              </Text>

              <Text className="text-light-200 text-sm mb-1">Email</Text>
              <TextInput
                className="bg-dark-100 text-white rounded-xl px-4 py-3 mb-4 border border-dark-200"
                value={email}
                onChangeText={handleChangeEmail}
                placeholder="you@example.com"
                placeholderTextColor="#9CA4AB"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
                autoComplete="email"
              />

              {formError ? (
                <Text className="text-red-400 text-sm mb-4">{formError}</Text>
              ) : null}

              <TouchableOpacity
                className="bg-accent py-3.5 rounded-xl items-center mb-4"
                onPress={() => void handlePressSubmit()}
                disabled={submitting}
              >
                <Text className="text-white font-bold text-base">
                  {submitting ? "Sending…" : "Send reset link"}
                </Text>
              </TouchableOpacity>

              <Link href="/login" asChild>
                <TouchableOpacity className="items-center py-3" disabled={submitting}>
                  <Text className="text-light-200 text-sm">
                    <Text className="text-accent font-semibold">Back to sign in</Text>
                  </Text>
                </TouchableOpacity>
              </Link>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPassword;
