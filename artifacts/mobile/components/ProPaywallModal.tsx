import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/subscription";

const PRO_FEATURES = [
  { icon: "cpu" as const, title: "Unlimited AI requests", description: "No daily cap — ask as much as you want" },
  { icon: "layers" as const, title: "All AI models", description: "GPT-4o, Claude, and Gemini" },
  { icon: "hard-drive" as const, title: "25 GB cloud storage", description: "Store all your important files" },
  { icon: "mail" as const, title: "Unlimited email accounts", description: "Connect as many as you need" },
  { icon: "mic" as const, title: "Voice-to-email", description: "Dictate and send emails hands-free" },
  { icon: "globe" as const, title: "Web search in AI", description: "Real-time web results in your AI chat" },
];

interface ProPaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ProPaywallModal({ visible, onClose }: ProPaywallModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { purchase, isPurchasing, currency } = useSubscription();
  const [selectedCycle, setSelectedCycle] = useState<"annual" | "monthly">("annual");
  const [error, setError] = useState<string | null>(null);

  const isUsd = currency === "usd";
  const monthlyPrice = isUsd ? "$7.99/mo" : "₹499/mo";
  const annualPrice = isUsd ? "$59.99/yr" : "₹3,999/yr";
  const annualMonthly = isUsd ? "$5.00/mo" : "₹333/mo";

  async function handlePurchase() {
    setError(null);
    try {
      await purchase({ billingCycle: selectedCycle, currency: currency ?? "usd" });
      onClose();
    } catch (err: any) {
      if (err?.message?.includes("cancel") || err?.message?.includes("dismiss")) return;
      setError(err?.message ?? "Purchase failed. Please try again.");
    }
  }

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

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={[styles.heroBadge, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="star" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>PinnboxIO Pro</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            Unlock the full power of your unified workspace
          </Text>

          <View style={styles.cycleRow}>
            <Pressable
              style={[
                styles.cycleBtn,
                selectedCycle === "annual" && { backgroundColor: colors.primary },
                { borderColor: selectedCycle === "annual" ? colors.primary : colors.border },
              ]}
              onPress={() => setSelectedCycle("annual")}
            >
              <Text style={[styles.cycleBtnText, { color: selectedCycle === "annual" ? "#fff" : colors.foreground }]}>
                Annual
              </Text>
              <View style={[styles.bestBadge, { backgroundColor: selectedCycle === "annual" ? "#fff3" : colors.primary + "20" }]}>
                <Text style={[styles.bestBadgeText, { color: selectedCycle === "annual" ? "#fff" : colors.primary }]}>Best Value</Text>
              </View>
            </Pressable>
            <Pressable
              style={[
                styles.cycleBtn,
                selectedCycle === "monthly" && { backgroundColor: colors.primary },
                { borderColor: selectedCycle === "monthly" ? colors.primary : colors.border },
              ]}
              onPress={() => setSelectedCycle("monthly")}
            >
              <Text style={[styles.cycleBtnText, { color: selectedCycle === "monthly" ? "#fff" : colors.foreground }]}>
                Monthly
              </Text>
            </Pressable>
          </View>

          <View style={[styles.priceCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>
              {selectedCycle === "annual" ? "Annual plan" : "Monthly plan"}
            </Text>
            <Text style={[styles.price, { color: colors.foreground }]}>
              {selectedCycle === "annual" ? annualPrice : monthlyPrice}
            </Text>
            {selectedCycle === "annual" && (
              <Text style={[styles.priceNote, { color: "#22c55e" }]}>
                That's {annualMonthly} — save {isUsd ? "37%" : "44%"}
              </Text>
            )}
          </View>

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
                  <Feather name="check" size={16} color="#22c55e" />
                </View>
              </React.Fragment>
            ))}
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: "#ef444420", borderColor: "#ef444440" }]}>
              <Feather name="alert-circle" size={14} color="#ef4444" />
              <Text style={[styles.errorText, { color: "#ef4444" }]}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.subscribeBtn,
              { backgroundColor: colors.primary, opacity: isPurchasing || pressed ? 0.8 : 1 },
            ]}
            onPress={handlePurchase}
            disabled={isPurchasing}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="star" size={16} color="#fff" />
                <Text style={styles.subscribeBtnText}>
                  Start Pro — {selectedCycle === "annual" ? annualPrice : monthlyPrice}
                </Text>
              </>
            )}
          </Pressable>

          <Text style={[styles.legalNote, { color: colors.mutedForeground }]}>
            Cancel anytime. No hidden fees.
          </Text>
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
  scroll: { padding: 24, gap: 18, paddingBottom: 8 },
  heroBadge: {
    width: 72, height: 72, borderRadius: 36,
    alignSelf: "center", alignItems: "center", justifyContent: "center",
  },
  heroTitle: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.5 },
  heroSub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  cycleRow: { flexDirection: "row", gap: 10 },
  cycleBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 12,
  },
  cycleBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  bestBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  bestBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  priceCard: {
    borderRadius: 16, borderWidth: 1, padding: 18, alignItems: "center", gap: 4,
  },
  priceLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.6 },
  price: { fontSize: 32, fontFamily: "Inter_700Bold" },
  priceNote: { fontSize: 13, fontFamily: "Inter_500Medium" },
  featureList: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  featureRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  featureIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  featureText: { flex: 1, minWidth: 0 },
  featureTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  featureDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, borderWidth: 1, padding: 12,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  footer: { paddingHorizontal: 24, paddingTop: 12, gap: 10 },
  subscribeBtn: {
    borderRadius: 14, paddingVertical: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  subscribeBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  legalNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
});
