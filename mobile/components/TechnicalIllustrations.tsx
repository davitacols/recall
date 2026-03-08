import React from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Brand } from '../constants/brand';

type IllustrationProps = {
  width?: number;
  height?: number;
};

export function DashboardIllustration({ width = 320, height = 140 }: IllustrationProps) {
  const c = Brand.colors;
  return (
    <Svg width={width} height={height} viewBox="0 0 320 140" fill="none">
      <Defs>
        <LinearGradient id="dashGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={c.surfaceAlt} />
          <Stop offset="1" stopColor="#f8eadc" />
        </LinearGradient>
      </Defs>
      <Rect x="0.5" y="0.5" width="319" height="139" fill="url(#dashGrad)" stroke={c.border} />
      <Rect x="16" y="20" width="98" height="46" fill="#fff" stroke={c.border} />
      <Rect x="122" y="20" width="80" height="46" fill="#fff" stroke={c.border} />
      <Rect x="210" y="20" width="94" height="46" fill="#fff" stroke={c.border} />
      <Path d="M26 88H292" stroke={c.border} />
      <Path d="M26 112H292" stroke={c.border} />
      <Path d="M36 88L68 75L94 95L132 70L170 90L212 66L248 80L284 58" stroke={c.accent} strokeWidth="2.5" />
      <Circle cx="132" cy="70" r="4.5" fill={c.accentSoft} />
      <Circle cx="212" cy="66" r="4.5" fill={c.accentSoft} />
    </Svg>
  );
}

export function AuthIllustration({ width = 320, height = 130 }: IllustrationProps) {
  const c = Brand.colors;
  return (
    <Svg width={width} height={height} viewBox="0 0 320 130" fill="none">
      <Defs>
        <LinearGradient id="authGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="1" stopColor={c.surfaceAlt} />
        </LinearGradient>
      </Defs>
      <Rect x="0.5" y="0.5" width="319" height="129" fill="url(#authGrad)" stroke={c.border} />
      <Path d="M20 102H300" stroke={c.border} />
      <Path d="M38 94V26H102V94" stroke={c.accentSoft} />
      <Path d="M122 94V46H188V94" stroke={c.accentSoft} />
      <Path d="M208 94V34H282V94" stroke={c.accentSoft} />
      <Circle cx="70" cy="46" r="5" fill={c.accent} />
      <Circle cx="156" cy="62" r="5" fill={c.accent} />
      <Circle cx="244" cy="52" r="5" fill={c.accent} />
      <Path d="M70 46L156 62L244 52" stroke={c.accent} strokeWidth="2.5" />
    </Svg>
  );
}
