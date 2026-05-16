import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/subscription";

const FREE_FEATURES = [
  "1 email account",
  "20 AI queries per day",
  "1 GB storage",
  "GPT-4o model",
];

const PRO_FEATURES = [
  { icon: "mail" as const, text: "Unlimited email accounts" },
  { icon: "cpu" as const, text: "Unlimited AI queries" },
  { icon: "hard-drive" as const, text: "25 GB cloud storage" },
  { icon: "layers" as const, text: "All AI models (GPT-4o, Claude, Gemini)" },
  { icon: "mic" as const, text: "Voice-to-email" },
  { icon: "globe" as const, text: "Web search in AI" },
];

type BillingCycle = "annual" | "monthly";

export default function PaywallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { purchase, isPurchasing, currency, isSubscribed } = useSubscription();
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>("annual");
  const [error, setError] = useState<string | null>(null);

  const isUsd = currency === "usd";

  const PRICES = {
    monthly: { usd: "$7.99/mo", inr: "₹499/mo" },
    annual: { usd: "$59.99/yr", inr: "₹3,999/yr", usdMonthly: "$5.00/mo", inrMonthly: "₹333/mo" },
  };

  const monthlyLabel = isUsd ? PRICES.monthly.usd : PRICES.monthly.inr;
  const annualLabel = isUsd ? PRICES.annual.usd : PRICES.annual.inr;
  const annualMonthlyLabel = isUsd ? PRICES.annual.usdMonthly : PRICES.annual.inrMonthly;

  async function handlePurchase() {
    setError(null);
    try {
      await purchase({ billingCycle: selectedCycle, currency: currency ?? "usd" });
      if (isSubscribed) {
        router.back();
      }
    } catch (err: any) {
      if (err?.message?.includes("cancel") || err?.message?.includes("dismiss")) return;
      setError(err?.message ?? "Purchase failed. Please try again.");
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={[styles.navbar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Upgrade to Pro</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroBadge, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="star" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.foreground }]}>PinnboxIO Pro</Text>
        <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
          Unlock the full power of your AI workspace
        </Text>

        <View style={styles.planToggle}>
          <Pressable
            style={[
              styles.planOption,
              selectedCycle === "annual" && { backgroundColor: colors.primary },
              { borderColor: selectedCycle === "annual" ? colors.primary : colors.border },
            ]}
            onPress={() => setSelectedCycle("annual")}
          >
            <View style={styles.planOptionInner}>
              <Text style={[
                styles.planOptionTitle,
                { color: selectedCycle === "annual" ? "#fff" : colors.foreground },
              ]}>Annual</Text>
              <Text style={[
                styles.planOptionPrice,
                { color: selectedCycle === "annual" ? "rgba(255,255,255,0.9)" : colors.mutedForeground },
              ]}>{annualMonthlyLabel} billed yearly</Text>
            </View>
            <View style={[styles.bestValueBadge, { backgroundColor: selectedCycle === "annual" ? "#fff3" : colors.primary + "20" }]}>
              <Text style={[styles.bestValueText, { color: selectedCycle === "annual" ? "#fff" : colors.primary }]}>
                Best Value
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.planOption,
              selectedCycle === "monthly" && { backgroundColor: colors.primary },
              { borderColor: selectedCycle === "monthly" ? colors.primary : colors.border },
            ]}
            onPress={() => setSelectedCycle("monthly")}
          >
            <View style={styles.planOptionInner}>
              <Text style={[
                styles.planOptionTitle,
                { color: selectedCycle === "monthly" ? "#fff" : colors.foreground },
              ]}>Monthly</Text>
              <Text style={[
                styles.planOptionPrice,
                { color: selectedCycle === "monthly" ? "rgba(255,255,255,0.9)" : colors.mutedForeground },
              ]}>{monthlyLabel} billed monthly</Text>
            </View>
          </Pressable>
        </View>

        <View style={[styles.priceDisplay, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.priceAmount, { color: colors.foreground }]}>
            {selectedCycle === "annual" ? annualLabel : monthlyLabel}
          </Text>
          {selectedCycle === "annual" && (
            <Text style={[styles.priceSaving, { color: "#22c55e" }]}>
              Save {isUsd ? "37%" : "44%"} vs monthly
            </Text>
          )}
        </View>

        <View style={[styles.comparisonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.comparisonHeader}>
            <Text style={[styles.comparisonCol, { color: colors.mutedForeground }]}>Feature</Text>
            <Text style={[styles.comparisonColVal, { color: colors.mutedForeground }]}>Free</Text>
            <Text style={[styles.comparisonColVal, { color: colors.primary }]}>Pro</Text>
          </View>
          <View style={[styles.comparisonDivider, { backgroundColor: colors.border }]} />
          {[
            { label: "Email accounts", free: "1", pro: "Unlimited" },
            { label: "AI queries/day", free: "20", pro: "Unlimited" },
            { label: "Storage", free: "1 GB", pro: "25 GB" },
            { label: "AI models", free: "GPT-4o", pro: "All models" },
            { label: "Voice-to-email", free: "—", pro: "✓" },
            { label: "Web search", free: "—", pro: "✓" },
          ].map((row, i) => (
            <React.Fragment key={row.label}>
              {i > 0 && <View style={[styles.comparisonDivider, { backgroundColor: colors.border }]} />}
              <View style={styles.comparisonRow}>
                <Text style={[styles.comparisonLabel, { color: colors.foreground }]}>{row.label}</Text>
                <Text style={[styles.comparisonVal, { color: colors.mutedForeground }]}>{row.free}</Text>
                <Text style={[styles.comparisonVal, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>{row.pro}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.featureCardTitle, { color: colors.foreground }]}>Everything in Pro</Text>
          {PRO_FEATURES.map((feat) => (
            <View key={feat.text} style={styles.featureRow}>
              <View style={[styles.featureIconWrap, { backgroundColor: colors.primary + "15" }]}>
                <Feather name={feat.icon} size={14} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, { color: colors.foreground }]}>{feat.text}</Text>
              <Feather name="check" size={14} color="#22c55e" />
            </View>
          ))}
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: "#ef444420", borderColor: "#ef444440" }]}>
            <Feather name="alert-circle" size={14} color="#ef4444" />
            <Text style={[styles.errorText, { color: "#ef4444" }]}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.ctaBtn,
            { backgroundColor: colors.primary, opacity: isPurchasing || pressed ? 0.85 : 1 },
          ]}
          onPress={handlePurchase}
          disabled={isPurchasing}
        >
          {isPurchasing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="star" size={18} color="#fff" />
              <Text style={styles.ctaBtnText}>
                Start Pro — {selectedCycle === "annual" ? annualLabel : monthlyLabel}
              </Text>
            </>
          )}
        </Pressable>

        <Text style={[styles.legalNote, { color: colors.mutedForeground }]}>
          Cancel anytime. No hidden fees.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  navTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 20, gap: 16 },
  heroBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.5 },
  heroSub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  planToggle: { gap: 10 },
  planOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
  },
  planOptionInner: { flex: 1, gap: 3 },
  planOptionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  planOptionPrice: { fontSize: 13, fontFamily: "Inter_400Regular" },
  bestValueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  bestValueText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  priceDisplay: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  priceAmount: { fontSize: 30, fontFamily: "Inter_700Bold" },
  priceSaving: { fontSize: 13, fontFamily: "Inter_500Medium" },
  comparisonCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  comparisonHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  comparisonCol: { flex: 1, fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  comparisonColVal: { width: 80, textAlign: "center", fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  comparisonDivider: { height: StyleSheet.hairlineWidth },
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  comparisonLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  comparisonVal: { width: 80, textAlign: "center", fontSize: 13, fontFamily: "Inter_400Regular" },
  featureCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  featureCardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  ctaBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 4,
  },
  ctaBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
  legalNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
});
