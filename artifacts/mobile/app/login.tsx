import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);

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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: topPad,
      paddingBottom: bottomPad + 24,
      paddingHorizontal: 32,
    },
    topSection: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 20,
    },
    logoBox: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    logoText: {
      color: colors.primaryForeground,
      fontSize: 24,
      fontFamily: "Inter_700Bold",
      letterSpacing: -1,
    },
    appName: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    tagline: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
      maxWidth: 260,
    },
    bottomSection: {
      gap: 16,
    },
    features: {
      gap: 12,
      marginBottom: 8,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    featureIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    featureText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
      flex: 1,
    },
    signInButton: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    signInButtonDisabled: {
      opacity: 0.6,
    },
    signInButtonText: {
      color: colors.primaryForeground,
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      letterSpacing: 0.2,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 4,
    },
  });

  const features = [
    { icon: "mail" as const, label: "Unified email inbox across all accounts" },
    { icon: "users" as const, label: "Smart contact management" },
    { icon: "search" as const, label: "Global message search" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>CH</Text>
        </View>
        <Text style={styles.appName}>CommsHub</Text>
        <Text style={styles.tagline}>
          Your unified communications workspace — email, contacts, and messages in one place.
        </Text>
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.features}>
          {features.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Feather name={f.icon} size={16} color={colors.primary} />
              </View>
              <Text style={styles.featureText}>{f.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <Pressable
          style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
          onPress={handleSignIn}
          disabled={isLoading}
          testID="sign-in-button"
        >
          {isLoading ? (
            <ActivityIndicator color={colors.primaryForeground} size="small" />
          ) : (
            <>
              <Feather name="log-in" size={18} color={colors.primaryForeground} />
              <Text style={styles.signInButtonText}>Sign in with Replit</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
