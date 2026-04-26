import React from "react";
import Svg, {
  Circle,
  Rect,
  Path,
  G,
  Line,
} from "react-native-svg";

const SIZE = 140;

export function InboxIllustration({ primary }: { primary: string }) {
  const bg = primary + "18";
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 140 140">
      <Rect x="0" y="0" width="140" height="140" rx="36" fill={bg} />

      {/* Back envelope (left) */}
      <G transform="translate(18, 42) rotate(-14, 34, 26)">
        <Rect x="0" y="8" width="48" height="34" rx="6" fill={`${primary}30`} />
        <Path d="M0 8 L24 26 L48 8" stroke={`${primary}50`} strokeWidth="1.5" fill="none" />
      </G>

      {/* Back envelope (right) */}
      <G transform="translate(76, 40) rotate(14, 34, 26)">
        <Rect x="0" y="8" width="48" height="34" rx="6" fill={`${primary}28`} />
        <Path d="M0 8 L24 26 L48 8" stroke={`${primary}45`} strokeWidth="1.5" fill="none" />
      </G>

      {/* Main (center) inbox tray */}
      <Rect x="30" y="66" width="80" height="44" rx="10" fill={primary} />
      {/* Tray slot */}
      <Rect x="52" y="85" width="36" height="5" rx="2.5" fill="#ffffff" opacity="0.35" />
      {/* Arrow going in */}
      <Path
        d="M70 52 L70 76"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Path
        d="M62 70 L70 78 L78 70"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Center envelope flap */}
      <Path
        d="M30 76 L70 98 L110 76"
        stroke="#ffffff"
        strokeWidth="2"
        fill="none"
        opacity="0.5"
      />

      {/* Small dots representing channels */}
      <Circle cx="38" cy="57" r="5" fill={primary} opacity="0.7" />
      <Circle cx="102" cy="57" r="5" fill={primary} opacity="0.5" />
      <Circle cx="70" cy="34" r="4" fill={primary} opacity="0.4" />
    </Svg>
  );
}

export function SearchIllustration({ emerald }: { emerald: string }) {
  const bg = emerald + "22";
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 140 140">
      <Rect x="0" y="0" width="140" height="140" rx="36" fill={bg} />

      {/* Stacked message rows */}
      <Rect x="24" y="34" width="70" height="10" rx="5" fill={`${emerald}30`} />
      <Rect x="24" y="50" width="55" height="10" rx="5" fill={`${emerald}25`} />
      <Rect x="24" y="66" width="62" height="10" rx="5" fill={`${emerald}20`} />
      <Rect x="24" y="82" width="44" height="10" rx="5" fill={`${emerald}15`} />

      {/* Magnifying glass */}
      <Circle cx="86" cy="82" r="26" fill="#ffffff" opacity="0.12" />
      <Circle
        cx="86"
        cy="82"
        r="22"
        stroke={emerald}
        strokeWidth="5"
        fill="none"
        opacity="0.9"
      />
      {/* Highlight inside lens */}
      <Circle cx="79" cy="75" r="5" fill={emerald} opacity="0.2" />
      {/* Handle */}
      <Line
        x1="102"
        y1="98"
        x2="116"
        y2="113"
        stroke={emerald}
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.9"
      />

      {/* Sparkle dots around glass */}
      <Circle cx="68" cy="58" r="3" fill={emerald} opacity="0.5" />
      <Circle cx="110" cy="66" r="2.5" fill={emerald} opacity="0.4" />
      <Circle cx="102" cy="56" r="2" fill={emerald} opacity="0.35" />

      {/* Highlighted row */}
      <Rect x="24" y="50" width="55" height="10" rx="5" fill={emerald} opacity="0.3" />
    </Svg>
  );
}

export function AIIllustration({ amber }: { amber: string }) {
  const bg = amber + "22";
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 140 140">
      <Rect x="0" y="0" width="140" height="140" rx="36" fill={bg} />

      {/* CPU chip body */}
      <Rect x="42" y="42" width="56" height="56" rx="10" fill={amber} opacity="0.15" />
      <Rect
        x="42"
        y="42"
        width="56"
        height="56"
        rx="10"
        stroke={amber}
        strokeWidth="3"
        fill="none"
        opacity="0.7"
      />

      {/* Inner chip core */}
      <Rect x="57" y="57" width="26" height="26" rx="5" fill={amber} opacity="0.85" />

      {/* Pin lines - top */}
      <Line x1="55" y1="42" x2="55" y2="32" stroke={amber} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <Line x1="70" y1="42" x2="70" y2="32" stroke={amber} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <Line x1="85" y1="42" x2="85" y2="32" stroke={amber} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      {/* Pin lines - bottom */}
      <Line x1="55" y1="98" x2="55" y2="108" stroke={amber} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <Line x1="70" y1="98" x2="70" y2="108" stroke={amber} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <Line x1="85" y1="98" x2="85" y2="108" stroke={amber} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      {/* Pin lines - left */}
      <Line x1="42" y1="55" x2="32" y2="55" stroke={amber} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <Line x1="42" y1="70" x2="32" y2="70" stroke={amber} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <Line x1="42" y1="85" x2="32" y2="85" stroke={amber} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      {/* Pin lines - right */}
      <Line x1="98" y1="55" x2="108" y2="55" stroke={amber} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <Line x1="98" y1="70" x2="108" y2="70" stroke={amber} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <Line x1="98" y1="85" x2="108" y2="85" stroke={amber} strokeWidth="3" strokeLinecap="round" opacity="0.6" />

      {/* Lightning bolt overlay on chip core */}
      <Path
        d="M73 58 L67 70 L71 70 L67 82 L75 68 L71 68 Z"
        fill="#ffffff"
        opacity="0.95"
      />
    </Svg>
  );
}

export function FreeIllustration({ primary }: { primary: string }) {
  const bg = primary + "18";
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 140 140">
      <Rect x="0" y="0" width="140" height="140" rx="36" fill={bg} />

      {/* Gift box body */}
      <Rect x="34" y="72" width="72" height="48" rx="8" fill={primary} opacity="0.85" />
      {/* Gift box lid */}
      <Rect x="28" y="58" width="84" height="20" rx="7" fill={primary} />
      {/* Vertical ribbon on body */}
      <Rect x="64" y="72" width="12" height="48" rx="0" fill="#ffffff" opacity="0.25" />
      {/* Horizontal ribbon on lid */}
      <Rect x="28" y="64" width="84" height="8" rx="0" fill="#ffffff" opacity="0.18" />

      {/* Ribbon bow - left loop */}
      <Path
        d="M56 58 C44 44, 38 32, 52 28 C62 25, 66 40, 70 58"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
      {/* Ribbon bow - right loop */}
      <Path
        d="M84 58 C96 44, 102 32, 88 28 C78 25, 74 40, 70 58"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />
      {/* Bow center knot */}
      <Circle cx="70" cy="58" r="6" fill="#ffffff" opacity="0.95" />
      <Circle cx="70" cy="58" r="3" fill={primary} />

      {/* Sparkle stars */}
      <Path
        d="M112 36 L114 30 L116 36 L122 38 L116 40 L114 46 L112 40 L106 38 Z"
        fill={primary}
        opacity="0.6"
      />
      <Path
        d="M26 44 L27.5 40 L29 44 L33 45.5 L29 47 L27.5 51 L26 47 L22 45.5 Z"
        fill={primary}
        opacity="0.45"
      />
      <Circle cx="108" cy="62" r="3" fill={primary} opacity="0.4" />
      <Circle cx="30" cy="76" r="2.5" fill={primary} opacity="0.35" />
    </Svg>
  );
}
