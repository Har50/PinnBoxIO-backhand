import { useSignIn, useSSO, isClerkAPIResponseError } from "@clerk/expo";
import { APP_NAME, LOGIN_TAGLINE } from "@workspace/brand";
import colors from "@/constants/colors";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useCallback } from "react";

WebBrowser.maybeCompleteAuthSession();

type Mode = "login" | "forgot-request" | "forgot-reset";

export default function LoginScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = isDark ? colors.dark : colors.light;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function handleSignIn() {
    if (!signIn) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === "complete" && setActive) {
        await setActive({ session: result.createdSessionId });
      }
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage ?? err.errors[0]?.message ?? "Sign-in failed.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleSignIn = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { createdSessionId, setActive: ssoSetActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && ssoSetActive) {
        await ssoSetActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error("[Google SSO]", JSON.stringify(err, null, 2));
      setError("Google sign-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [startSSOFlow]);

  async function handleForgotRequest() {
    if (!signIn) return;
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setMode("forgot-reset");
      setSuccessMsg(`A reset code was sent to ${email}`);
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage ?? err.errors[0]?.message ?? "Failed to send reset email.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotReset() {
    if (!signIn || !setActive) return;
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode,
        password: newPassword,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      }
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage ?? err.errors[0]?.message ?? "Reset failed. Please try again.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  function goBackToLogin() {
    setMode("login");
    setError(null);
    setSuccessMsg(null);
    setResetCode("");
    setNewPassword("");
  }

  const bg = c.background;
  const cardBg = c.card;

  if (mode === "forgot-request" || mode === "forgot-reset") {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: bg, paddingTop: topPad, paddingBottom: bottomPad + 24 }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.header, { paddingTop: 8 }]}>
          <Pressable onPress={goBackToLogin} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={c.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: c.foreground }]}>
            {mode === "forgot-request" ? "Reset password" : "Set new password"}
          </Text>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.topSection}>
          <View style={[styles.logoBox, { backgroundColor: c.primary, shadowColor: c.primary }]}>
            <Text style={[styles.logoText, { color: c.primaryForeground }]}>PB</Text>
          </View>
          <Text style={[styles.appName, { color: c.foreground }]}>
            {mode === "forgot-request" ? "Forgot your password?" : "Almost done"}
          </Text>
          <Text style={[styles.tagline, { color: c.mutedForeground }]}>
            {mode === "forgot-request"
              ? "Enter your email and we'll send you a reset code."
              : `Enter the code sent to ${email} and choose a new password.`}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: c.border }]}>
          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: c.unreadLight, borderColor: isDark ? "#7f1d1d" : "#fecaca" }]} accessibilityRole="alert">
              <Feather name="alert-circle" size={14} color={c.destructive} style={{ marginTop: 2 }} accessibilityElementsHidden importantForAccessibility="no" />
              <Text style={[styles.errorText, { color: c.destructive }]}>{error}</Text>
            </View>
          ) : null}

          {successMsg ? (
            <View style={[styles.successBanner, { backgroundColor: isDark ? "#052e16" : "#f0fdf4", borderColor: isDark ? "#166534" : "#bbf7d0" }]}>
              <Feather name="check-circle" size={14} color={isDark ? "#4ade80" : "#16a34a"} style={{ marginTop: 2 }} />
              <Text style={[styles.successText, { color: isDark ? "#4ade80" : "#16a34a" }]}>{successMsg}</Text>
            </View>
          ) : null}

          {mode === "forgot-request" ? (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: c.mutedForeground }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: bg, borderColor: c.border, color: c.foreground }]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={c.mutedForeground}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                autoFocus
              />
            </View>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: c.mutedForeground }]}>Reset code</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: bg, borderColor: c.border, color: c.foreground }]}
                  value={resetCode}
                  onChangeText={setResetCode}
                  placeholder="6-digit code from email"
                  placeholderTextColor={c.mutedForeground}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: c.mutedForeground }]}>New password</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: bg, borderColor: c.border, color: c.foreground }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Choose a new password"
                  placeholderTextColor={c.mutedForeground}
                  secureTextEntry
                  autoComplete="new-password"
                />
              </View>
            </>
          )}

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary },
              (isLoading || (mode === "forgot-request" ? !email : (!resetCode || !newPassword))) && styles.btnDisabled]}
            onPress={mode === "forgot-request" ? handleForgotRequest : handleForgotReset}
            disabled={isLoading || (mode === "forgot-request" ? !email : (!resetCode || !newPassword))}
          >
            {isLoading ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Feather name={mode === "forgot-request" ? "send" : "check"} size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>
                  {mode === "forgot-request" ? "Send reset code" : "Set new password"}
                </Text>
              </>
            )}
          </Pressable>

          {mode === "forgot-reset" ? (
            <Pressable onPress={() => setMode("forgot-request")} style={{ alignItems: "center" }}>
              <Text style={[styles.linkText, { color: c.primary }]}>Resend code</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: c.mutedForeground }]}>Terms · Privacy</Text>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bg, paddingTop: topPad, paddingBottom: bottomPad + 24 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.topSection}>
        <View style={[styles.logoBox, { backgroundColor: c.primary, shadowColor: c.primary }]}>
          <Text style={[styles.logoText, { color: c.primaryForeground }]}>PB</Text>
        </View>
        <Text style={[styles.appName, { color: c.foreground }]}>{APP_NAME}</Text>
        <Text style={[styles.tagline, { color: c.mutedForeground }]}>{LOGIN_TAGLINE}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor: c.border }]}>
        {error ? (
          <View
            style={[styles.errorBanner, { backgroundColor: c.unreadLight, borderColor: isDark ? "#7f1d1d" : "#fecaca" }]}
            accessibilityRole="alert"
            testID="login-error-banner"
          >
            <Feather name="alert-circle" size={14} color={c.destructive} style={{ marginTop: 2 }} accessibilityElementsHidden importantForAccessibility="no" />
            <Text style={[styles.errorText, { color: c.destructive }]}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.googleBtn, { borderColor: c.border, backgroundColor: cardBg }]}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
        >
          <GoogleIcon />
          <Text style={[styles.googleBtnText, { color: c.foreground }]}>Continue with Google</Text>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
          <Text style={[styles.dividerText, { color: c.mutedForeground }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: c.mutedForeground }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: bg, borderColor: c.border, color: c.foreground }]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={c.mutedForeground}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            testID="email-input"
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.passwordLabelRow}>
            <Text style={[styles.inputLabel, { color: c.mutedForeground }]}>Password</Text>
            <Pressable onPress={() => { setError(null); setMode("forgot-request"); }} testID="forgot-password-link">
              <Text style={[styles.forgotText, { color: c.primary }]}>Forgot password?</Text>
            </Pressable>
          </View>
          <TextInput
            style={[styles.input, { backgroundColor: bg, borderColor: c.border, color: c.foreground }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor={c.mutedForeground}
            secureTextEntry
            autoComplete="password"
            testID="password-input"
          />
        </View>

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: c.primary }, (isLoading || !email || !password) && styles.btnDisabled]}
          onPress={handleSignIn}
          disabled={isLoading || !email || !password}
          testID="sign-in-button"
        >
          {isLoading ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Feather name="log-in" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Sign in</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={[styles.outlineBtn, { borderColor: c.primary }]}
          onPress={() => router.push("/signup")}
          disabled={isLoading}
          testID="sign-up-button"
        >
          <Feather name="user-plus" size={18} color={c.primary} />
          <Text style={[styles.outlineBtnText, { color: c.primary }]}>Create account</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: c.mutedForeground }]}>
          Terms · Privacy · Refunds · Cookies
        </Text>
      </View>

      <View nativeID="clerk-captcha" />
    </KeyboardAvoidingView>
  );
}

function GoogleIcon() {
  return (
    <View style={{ width: 20, height: 20 }}>
      <Text style={{ fontSize: 16, lineHeight: 20 }}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 0,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.2,
  },
  topSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  appName: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 13,
  },
  googleBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  inputGroup: {
    gap: 6,
  },
  passwordLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  forgotText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "transparent",
  },
  outlineBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  successBanner: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  successText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  linkText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
