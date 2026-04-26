import { useAuth } from "@/contexts/AuthContext";
import { APP_NAME } from "@workspace/brand";
import colors from "@/constants/colors";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";


const c = colors.light;

const FEATURES = [
  {
    icon: "inbox" as const,
    title: "All your inboxes, one place",
    description: "Connect Gmail, Outlook, WhatsApp, LinkedIn and more — read and reply from a single feed.",
  },
  {
    icon: "search" as const,
    title: "Unified search",
    description: "Find any message across every connected channel in seconds.",
  },
  {
    icon: "cpu" as const,
    title: "AI-powered replies",
    description: "Let the built-in AI draft replies and summarise long threads so you can focus on what matters.",
  },
  {
    icon: "hard-drive" as const,
    title: "Cloud storage, built in",
    description: "Attach and access files across your communications without switching apps.",
  },
];

export default function SignUpScreen() {
  const { signUp, signInError } = useAuth();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function handleContinue() {
    setIsLoading(true);
    try {
      await signUp();
    } finally {
      setIsLoading(false);
    }
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/login");
    }
  }

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad + 16 }]}>
      <View style={[styles.header, { paddingTop: 8 }]}>
        <Pressable onPress={handleBack} style={styles.backButton} testID="signup-back-button">
          <Feather name="arrow-left" size={20} color={c.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Create account</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>PB</Text>
          </View>
          <Text style={styles.heroTitle}>Welcome to {APP_NAME}</Text>
          <Text style={styles.heroSubtitle}>
            Your free account gives you access to all of these features from day one.
          </Text>
        </View>

        <View style={styles.featureList}>
          {FEATURES.map((feature) => (
            <View key={feature.icon} style={styles.featureRow}>
              <View style={styles.featureIconBox}>
                <Feather name={feature.icon} size={18} color={c.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {signInError ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={14} color="#dc2626" style={{ marginTop: 2 }} />
            <Text style={styles.errorText}>{signInError}</Text>
          </View>
        ) : null}
        <Pressable
          style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={isLoading}
          testID="signup-continue-button"
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Feather name="user-plus" size={18} color="#ffffff" />
              <Text style={styles.continueButtonText}>Create my free account</Text>
            </>
          )}
        </Pressable>
        <Text style={styles.footerNote}>
          By continuing you agree to our{" "}
          <Text style={styles.footerLink}>Terms</Text> and{" "}
          <Text style={styles.footerLink}>Privacy Policy</Text>.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: c.foreground,
    letterSpacing: -0.2,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  heroSection: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: c.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    color: c.primaryForeground,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: c.foreground,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: c.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  featureList: {
    gap: 12,
    paddingBottom: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  featureIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${c.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
    gap: 3,
  },
  featureTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: c.foreground,
    letterSpacing: -0.1,
  },
  featureDescription: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: c.mutedForeground,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  continueButton: {
    backgroundColor: c.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
  footerNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: c.mutedForeground,
    textAlign: "center",
    lineHeight: 17,
  },
  footerLink: {
    color: c.primary,
    fontFamily: "Inter_500Medium",
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
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
    color: "#dc2626",
    flex: 1,
    lineHeight: 18,
  },
});
