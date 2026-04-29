import { useAuth } from "@/contexts/AuthContext";
import { APP_NAME } from "@workspace/brand";
import colors from "@/constants/colors";
import { Feather } from "@expo/vector-icons";
import {
  InboxIllustration,
  SearchIllustration,
  AIIllustration,
  FreeIllustration,
} from "@/components/OnboardingIllustrations";
import { router } from "expo-router";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRef, useState, useEffect } from "react";

const SLIDE_DATA = [
  {
    key: "inbox",
    title: "All your inboxes, one place",
    description:
      "Connect Gmail, Outlook and more — read and reply from a single unified feed.",
  },
  {
    key: "search",
    title: "Unified search",
    description:
      "Find any message across every connected channel in seconds, no matter where it was sent.",
  },
  {
    key: "ai",
    title: "AI-powered replies",
    description:
      "Let the built-in AI draft replies and summarise long threads so you can focus on what matters.",
  },
  {
    key: "free",
    title: "Free from day one",
    description:
      "Every feature unlocked the moment you sign up — no credit card, no hidden fees.",
  },
];

const TOTAL = SLIDE_DATA.length;

export default function SignUpScreen() {
  const { signUp, signInError } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );
    return () => subscription.remove();
  }, []);

  const illustrationAnims = useRef(
    SLIDE_DATA.map(() => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.82),
    }))
  ).current;

  const textAnims = useRef(
    SLIDE_DATA.map(() => ({
      titleOpacity: new Animated.Value(0),
      titleTranslateY: new Animated.Value(8),
      descOpacity: new Animated.Value(0),
      descTranslateY: new Animated.Value(8),
    }))
  ).current;

  useEffect(() => {
    const anim = illustrationAnims[activeIndex];
    const text = textAnims[activeIndex];

    if (reduceMotion) {
      anim.opacity.setValue(1);
      anim.scale.setValue(1);
      text.titleOpacity.setValue(1);
      text.titleTranslateY.setValue(0);
      text.descOpacity.setValue(1);
      text.descTranslateY.setValue(0);
      return;
    }

    anim.opacity.setValue(0);
    anim.scale.setValue(0.82);
    text.titleOpacity.setValue(0);
    text.titleTranslateY.setValue(8);
    text.descOpacity.setValue(0);
    text.descTranslateY.setValue(8);

    Animated.parallel([
      Animated.timing(anim.opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(anim.scale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 16,
        stiffness: 220,
        mass: 1,
      }),
      Animated.sequence([
        Animated.delay(80),
        Animated.parallel([
          Animated.timing(text.titleOpacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(text.titleTranslateY, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(120),
        Animated.parallel([
          Animated.timing(text.descOpacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(text.descTranslateY, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [activeIndex, reduceMotion]);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = isDark ? colors.dark : colors.light;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isFinal = activeIndex === TOTAL - 1;

  function renderIllustration(key: string) {
    switch (key) {
      case "inbox":
        return <InboxIllustration primary={c.primary} dark={isDark} />;
      case "search":
        return <SearchIllustration emerald={c.emerald} dark={isDark} />;
      case "ai":
        return <AIIllustration amber={c.amber} dark={isDark} />;
      case "free":
        return <FreeIllustration primary={c.primary} dark={isDark} />;
      default:
        return null;
    }
  }

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

  function goToSlide(index: number) {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  }

  function handleNext() {
    if (activeIndex < TOTAL - 1) {
      goToSlide(activeIndex + 1);
    }
  }

  function handleScroll(event: { nativeEvent: { contentOffset: { x: number } } }) {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < TOTAL) {
      setActiveIndex(index);
    }
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: c.background, paddingTop: topPad, paddingBottom: bottomPad + 16 },
      ]}
    >
      <View style={[styles.header, { paddingTop: 8 }]}>
        <Pressable onPress={handleBack} style={styles.backButton} testID="signup-back-button">
          <Feather name="arrow-left" size={20} color={c.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.foreground }]}>Create account</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.heroSection}>
        <View style={[styles.logoBox, { backgroundColor: c.primary, shadowColor: c.primary }]}>
          <Text style={[styles.logoText, { color: c.primaryForeground }]}>PB</Text>
        </View>
        <Text style={[styles.heroTitle, { color: c.foreground }]}>Welcome to {APP_NAME}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.carousel}
        contentContainerStyle={styles.carouselContent}
        testID="signup-carousel"
      >
        {SLIDE_DATA.map((slide, i) => (
          <View key={slide.key} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <Animated.View
              testID={`signup-illustration-${slide.key}`}
              style={[
                styles.slideIllustrationBox,
                {
                  opacity: illustrationAnims[i].opacity,
                  transform: [{ scale: illustrationAnims[i].scale }],
                },
              ]}
            >
              {renderIllustration(slide.key)}
            </Animated.View>
            <Animated.Text
              style={[
                styles.slideTitle,
                { color: c.foreground },
                {
                  opacity: textAnims[i].titleOpacity,
                  transform: [{ translateY: textAnims[i].titleTranslateY }],
                },
              ]}
            >
              {slide.title}
            </Animated.Text>
            <Animated.Text
              style={[
                styles.slideDescription,
                { color: c.mutedForeground },
                {
                  opacity: textAnims[i].descOpacity,
                  transform: [{ translateY: textAnims[i].descTranslateY }],
                },
              ]}
            >
              {slide.description}
            </Animated.Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotsRow}>
        {SLIDE_DATA.map((slide, i) => (
          <Pressable
            key={slide.key}
            onPress={() => goToSlide(i)}
            style={[
              styles.dot,
              { backgroundColor: c.border },
              i === activeIndex && { width: 22, backgroundColor: c.primary },
            ]}
            testID={`signup-dot-${i}`}
            accessibilityLabel={`Go to slide ${i + 1}`}
          />
        ))}
      </View>

      <View style={[styles.footer, { borderTopColor: c.border }]}>
        {signInError ? (
          <View
            style={[
              styles.errorBanner,
              isDark && { backgroundColor: "#450a0a", borderColor: "#7f1d1d" },
            ]}
            accessibilityRole="alert"
            testID="signup-error-banner"
          >
            <Feather
              name="alert-circle"
              size={14}
              color={isDark ? "#f87171" : "#dc2626"}
              style={{ marginTop: 2 }}
            />
            <Text style={[styles.errorText, isDark && { color: "#f87171" }]}>{signInError}</Text>
          </View>
        ) : null}

        {isFinal ? (
          <Pressable
            style={[
              styles.continueButton,
              { backgroundColor: c.primary },
              isLoading && styles.continueButtonDisabled,
            ]}
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
        ) : (
          <Pressable
            style={[styles.nextButton, { borderColor: c.primary }]}
            onPress={handleNext}
            testID="signup-next-button"
          >
            <Text style={[styles.nextButtonText, { color: c.primary }]}>Next</Text>
            <Feather name="arrow-right" size={16} color={c.primary} />
          </Pressable>
        )}

        <Text style={[styles.footerNote, { color: c.mutedForeground }]}>
          By continuing you agree to our{" "}
          <Text style={[styles.footerLink, { color: c.primary }]}>Terms</Text> and{" "}
          <Text style={[styles.footerLink, { color: c.primary }]}>Privacy Policy</Text>.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    letterSpacing: -0.2,
  },
  heroSection: {
    alignItems: "center",
    gap: 10,
    paddingTop: 12,
    paddingBottom: 8,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  carousel: {
    flex: 1,
  },
  carouselContent: {
    alignItems: "center",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 16,
  },
  slideIllustrationBox: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  slideTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  slideDescription: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
  },
  continueButton: {
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
  nextButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1.5,
  },
  nextButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
  footerNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 17,
  },
  footerLink: {
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
