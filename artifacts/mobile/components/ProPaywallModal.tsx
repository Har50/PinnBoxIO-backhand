import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";

const PRO_FEATURES = [
  { icon: "cpu" as const, title: "Unlimited AI requests", description: "No daily cap — ask as much as you want" },
  { icon: "zap" as const, title: "Priority AI responses", description: "Faster replies with the latest models" },
  { icon: "hard-drive" as const, title: "Cloud storage upgrades", description: "Expand up to 100 GB of file storage" },
  { icon: "mail" as const, title: "Smart inbox features", description: "AI-powered triage and summaries" },
  { icon: "shield" as const, title: "Premium support", description: "Priority help when you need it" },
];

interface ProPaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ProPaywallModal({ visible, onClose }: ProPaywallModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { offerings, purchase, restore, isPurchasing, isRestoring, isAvailable } = useSubscription();
  const [error, setError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  const proPackage =
    offerings?.current?.monthly ??
    offerings?.current?.availablePackages?.find(
      (p: any) => p.packageType === "MONTHLY" || p.identifier?.toLowerCase().includes("monthly")
    ) ??
    offerings?.current?.availablePackages?.[0] ??
    null;

  const price = proPackage?.product?.priceString ?? "$7.99";

  async function handlePurchase() {
    if (!proPackage) return;
    setError(null);
    try {
      await purchase(proPackage);
      onClose();
    } catch (err: any) {
      if (err?.userCancelled || err?.code === "1") return;
      setError(err?.message ?? "Purchase failed. Please try again.");
    }
  }

  async function handleRestore() {
    setError(null);
    setRestoreSuccess(false);
    try {
      await restore();
      setRestoreSuccess(true);
      setTimeout(() => {
        setRestoreSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message ?? "Could not restore purchases. Please try again.");
    }
  }

  const busy = isPurchasing || isRestoring;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Upgrade to Pro</Text>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.heroBadge, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="star" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>PinnboxIO Pro</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            Unlock the full power of your unified workspace
          </Text>

          <View style={[styles.featureList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {PRO_FEATURES.map((feature, i) => (
              <React.Fragment key={feature.title}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <View style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name={feature.icon} size={16} color={colors.primary} />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={[styles.featureTitle, { color: colors.foreground }]}>{feature.title}</Text>
                    <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>{feature.description}</Text>
                  </View>
                  <Feather name="check" size={16} color={colors.primary} />
                </View>
              </React.Fragment>
            ))}
          </View>

          <View style={[styles.priceCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>Monthly subscription</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.foreground }]}>{price}</Text>
              <Text style={[styles.pricePeriod, { color: colors.mutedForeground }]}> / month</Text>
            </View>
            <Text style={[styles.priceNote, { color: colors.mutedForeground }]}>
              Cancel anytime from your {Platform.OS === "ios" ? "App Store" : "Play Store"} account settings
            </Text>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: "#ef444420", borderColor: "#ef444440" }]}>
              <Feather name="alert-circle" size={14} color="#ef4444" />
              <Text style={[styles.errorText, { color: "#ef4444" }]}>{error}</Text>
            </View>
          ) : null}

          {restoreSuccess ? (
            <View style={[styles.errorBox, { backgroundColor: "#22c55e20", borderColor: "#22c55e40" }]}>
              <Feather name="check-circle" size={14} color="#22c55e" />
              <Text style={[styles.errorText, { color: "#22c55e" }]}>Purchases restored successfully!</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {!isAvailable ? (
            <View style={[styles.unavailableBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="info" size={14} color={colors.mutedForeground} />
              <Text style={[styles.unavailableText, { color: colors.mutedForeground }]}>
                In-app purchases are only available in the native app (iOS/Android).
              </Text>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.subscribeBtn,
                { backgroundColor: colors.primary, opacity: busy || pressed ? 0.8 : 1 },
              ]}
              onPress={handlePurchase}
              disabled={busy || !proPackage}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="star" size={16} color="#fff" />
                  <Text style={styles.subscribeBtnText}>Subscribe for {price}/month</Text>
                </>
              )}
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [styles.restoreBtn, { opacity: busy || pressed ? 0.6 : 1 }]}
            onPress={handleRestore}
            disabled={busy || !isAvailable}
          >
            {isRestoring ? (
              <ActivityIndicator color={colors.mutedForeground} size="small" />
            ) : (
              <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>Restore purchases</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", flex: 3, textAlign: "center" },
  closeBtn: { flex: 1, alignItems: "flex-end" },
  scroll: { padding: 24, gap: 20, paddingBottom: 8 },
  heroBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.5 },
  heroSub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  featureList: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: { flex: 1, minWidth: 0 },
  featureTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  featureDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
  priceCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 4,
  },
  priceLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.6 },
  priceRow: { flexDirection: "row", alignItems: "baseline" },
  price: { fontSize: 36, fontFamily: "Inter_700Bold" },
  pricePeriod: { fontSize: 16, fontFamily: "Inter_400Regular" },
  priceNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  footer: { paddingHorizontal: 24, paddingTop: 12, gap: 12 },
  subscribeBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  subscribeBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  restoreBtn: { alignItems: "center", paddingVertical: 8 },
  restoreText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  unavailableBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  unavailableText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
});
