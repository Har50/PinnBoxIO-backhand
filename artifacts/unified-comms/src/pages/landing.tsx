import { Mail, Users, Search } from "lucide-react";
import { useLocation } from "wouter";
import { APP_NAME, APP_TAGLINE, FEATURE_LABELS, brand } from "@workspace/brand";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const FEATURE_ICONS = [Mail, Users, Search] as const;

if (FEATURE_LABELS.length !== FEATURE_ICONS.length) {
  throw new Error(
    `@workspace/brand FEATURE_LABELS has ${FEATURE_LABELS.length} items but landing page defines ${FEATURE_ICONS.length} icons. Add/remove icons to match.`
  );
}

export const heroFeatures = FEATURE_LABELS.map((label, i) => ({
  Icon: FEATURE_ICONS[i],
  label,
}));

export function AuthHeroPanel() {
  return (
    <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-6 w-full md:max-w-sm">
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          backgroundColor: brand.primary,
          boxShadow: `0 8px 32px ${brand.primaryShadow}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: brand.primaryForeground,
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: -1,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          PB
        </span>
      </div>

      <div>
        <h1
          style={{
            color: brand.dark.foreground,
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: -0.5,
            fontFamily: "Inter, system-ui, sans-serif",
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {APP_NAME}
        </h1>
        <p
          style={{
            color: brand.dark.foregroundMuted,
            fontSize: 15,
            fontFamily: "Inter, system-ui, sans-serif",
            lineHeight: 1.6,
            marginTop: 8,
            marginBottom: 0,
          }}
        >
          {APP_TAGLINE}
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {heroFeatures.map(({ Icon, label }) => (
          <div key={label} className="flex items-center gap-3">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: brand.dark.surfaceDeep,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={16} color={brand.primary} />
            </div>
            <span
              style={{
                color: brand.dark.foregroundSubtle,
                fontSize: 14,
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 500,
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-6 py-12"
      style={{ backgroundColor: brand.dark.background }}
    >
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        <AuthHeroPanel />

        <div style={{ height: 1, backgroundColor: brand.dark.surface, width: "100%" }} />

        <button
          onClick={() => setLocation("/sign-in")}
          className="w-full"
          style={{
            backgroundColor: brand.primary,
            color: brand.primaryForeground,
            borderRadius: 14,
            paddingTop: 16,
            paddingBottom: 16,
            fontSize: 16,
            fontWeight: 600,
            fontFamily: "Inter, system-ui, sans-serif",
            letterSpacing: 0.2,
            border: "none",
            cursor: "pointer",
            boxShadow: `0 4px 16px ${brand.primaryButtonShadow}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = brand.primaryHover;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = brand.primary;
          }}
        >
          Sign in
        </button>

        <button
          onClick={() => setLocation("/sign-up")}
          className="w-full"
          style={{
            backgroundColor: "transparent",
            color: brand.dark.foregroundMuted,
            borderRadius: 14,
            paddingTop: 14,
            paddingBottom: 14,
            fontSize: 15,
            fontWeight: 500,
            fontFamily: "Inter, system-ui, sans-serif",
            letterSpacing: 0.1,
            border: `1px solid ${brand.dark.border}`,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = brand.dark.surface;
            (e.currentTarget as HTMLButtonElement).style.color = brand.dark.foregroundSubtle;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = brand.dark.border;
            (e.currentTarget as HTMLButtonElement).style.color = brand.dark.foregroundMuted;
          }}
        >
          Create account
        </button>

        <div className="flex flex-wrap justify-center gap-4 text-xs" style={{ color: brand.dark.footerText }}>
          {(["Terms", "Privacy", "Refunds", "Cookies"] as const).map((label) => (
            <a
              key={label}
              href={`${basePath}/${label.toLowerCase()}`}
              style={{ color: brand.dark.footerText, textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = brand.dark.footerLinkHover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = brand.dark.footerText; }}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
