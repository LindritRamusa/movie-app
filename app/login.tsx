import { MIN_PASSWORD_LEN } from "@/constants/auth";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { useAuth } from "@/store/AuthContext";
import { formatSupabaseError } from "@/utils/supabaseErrors";
import { Link, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
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

const Login = () => {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const submitLockRef = useRef(false);

  const handleChangeEmail = useCallback((text: string) => {
    setEmail(text);
  }, []);

  const handleChangePassword = useCallback((text: string) => {
    setPassword(text);
  }, []);

  const handlePressSubmit = useCallback(async () => {
    if (submitLockRef.current) {
      return;
    }
    setFormError(null);
    const trimmedEmail = email.trim();
    const trimmedPassword = password;
    if (!trimmedEmail || !trimmedPassword) {
      setFormError("Enter email and password.");
      return;
    }
    if (trimmedPassword.length < MIN_PASSWORD_LEN) {
      setFormError(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
      return;
    }
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      await signIn(trimmedEmail, trimmedPassword);
      router.replace("/(tabs)/profile");
    } catch (e) {
      setFormError(formatSupabaseError(e, "auth"));
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }, [email, password, router, signIn]);

  const handlePressBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/profile");
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
            <Text className="text-3xl font-bold text-white">Sign in</Text>
          </View>

          <Text className="text-light-200 text-sm mb-6">
            Sign in with the email and password you used to create your account.
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

          <Text className="text-light-200 text-sm mb-1">Password</Text>
          <TextInput
            className="bg-dark-100 text-white rounded-xl px-4 py-3 mb-2 border border-dark-200"
            value={password}
            onChangeText={handleChangePassword}
            placeholder="Password"
            placeholderTextColor="#9CA4AB"
            secureTextEntry
            editable={!submitting}
            autoComplete="password"
          />

          <Link href="/forgot-password" asChild>
            <TouchableOpacity
              className="self-end mb-4 py-1"
              disabled={submitting}
              accessibilityRole="link"
              accessibilityLabel="Forgot password"
            >
              <Text className="text-accent text-sm font-semibold">Forgot password?</Text>
            </TouchableOpacity>
          </Link>

          {formError ? (
            <Text className="text-red-400 text-sm mb-4">{formError}</Text>
          ) : null}

          <TouchableOpacity
            className="bg-accent py-3.5 rounded-xl items-center mb-4"
            onPress={() => void handlePressSubmit()}
            disabled={submitting}
          >
            <Text className="text-white font-bold text-base">
              {submitting ? "Signing in…" : "Sign in"}
            </Text>
          </TouchableOpacity>

          <Link href="/register" asChild>
            <TouchableOpacity className="items-center py-3" disabled={submitting}>
              <Text className="text-light-200 text-sm">
                Need an account?{" "}
                <Text className="text-accent font-semibold">Create one</Text>
              </Text>
            </TouchableOpacity>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Login;
