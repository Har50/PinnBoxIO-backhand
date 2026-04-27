import { useAuth } from "@/contexts/AuthContext";
import { APP_NAME, LOGIN_TAGLINE } from "@workspace/brand";
import colors from "@/constants/colors";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";

export default function LoginScreen() {
  const { signIn, signInError } = useAuth();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = isDark ? colors.dark : colors.light;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function handleSignIn() {
    setIsLoading(true);
    try {
      await signIn();
    } finally {
      setIsLoading(false);
    }
  }

  function handleCreateAccount() {
    router.push("/signup");
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: c.background, paddingTop: topPad, paddingBottom: bottomPad + 24 },
      ]}
    >
      <View style={styles.topSection}>
        <View
          style={[
            styles.logoBox,
            { backgroundColor: c.primary, shadowColor: c.primary },
          ]}
        >
          <Text style={[styles.logoText, { color: c.primaryForeground }]}>PB</Text>
        </View>
        <Text style={[styles.appName, { color: c.foreground }]}>{APP_NAME}</Text>
        <Text style={[styles.tagline, { color: c.mutedForeground }]}>{LOGIN_TAGLINE}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        {signInError ? (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: c.unreadLight, borderColor: isDark ? "#7f1d1d" : "#fecaca" },
            ]}
            accessibilityRole="alert"
            testID="login-error-banner"
          >
            <Feather
              name="alert-circle"
              size={14}
              color={c.destructive}
              style={{ marginTop: 2 }}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={[styles.errorText, { color: c.destructive }]}>{signInError}</Text>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.signInButton,
            { backgroundColor: c.primary },
            isLoading && styles.signInButtonDisabled,
          ]}
          onPress={handleSignIn}
          disabled={isLoading}
          testID="sign-in-button"
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Feather name="log-in" size={18} color="#ffffff" />
              <Text style={styles.signInButtonText}>Sign in</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={[
            styles.signUpButton,
            { borderColor: c.primary },
            isLoading && styles.signInButtonDisabled,
          ]}
          onPress={handleCreateAccount}
          disabled={isLoading}
          testID="sign-up-button"
        >
          <Feather name="user-plus" size={18} color={c.primary} />
          <Text style={[styles.signUpButtonText, { color: c.primary }]}>Create account</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: c.mutedForeground }]}>
          Terms · Privacy · Refunds · Cookies
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
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
    gap: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  signInButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
  signUpButton: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "transparent",
  },
  signUpButtonText: {
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
  footer: {
    alignItems: "center",
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
