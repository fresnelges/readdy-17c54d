/**
 * Génère une palette de couleurs complète à partir d'une couleur principale (couleurcharte).
 * Utilisé pour injecter la charte graphique du tenant dans les thèmes.
 */

export interface ChartPalette {
  primary: string;
  primaryR: number;
  primaryG: number;
  primaryB: number;
  primaryLight: string;
  primaryDark: string;
  primaryFg: string; // foreground on primary (white or dark)
  accent: string;
  accentR: number;
  accentG: number;
  accentB: number;
  accentLight: string;
  accentDark: string;
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  background: string;
  backgroundR: number;
  backgroundG: number;
  backgroundB: number;
  backgroundAlt: string;
  foreground: string;
  foregroundMuted: string;
  foregroundSubtle: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  if (max === min) {
    h = 0;
  } else {
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  // Relative luminance approximation
  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  return luminance > 140;
}

function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb.r + (255 - rgb.r) * amount,
    rgb.g + (255 - rgb.g) * amount,
    rgb.b + (255 - rgb.b) * amount,
  );
}

function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb.r * (1 - amount),
    rgb.g * (1 - amount),
    rgb.b * (1 - amount),
  );
}

/**
 * Parse couleurcharte value. Handles both:
 * - Simple hex: "#2124B1"
 * - JSON: '{"primary":"#2124B1","accent":"#FF6B35","secondary":"#..."}'
 */
export function parseCharte(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  // If it's a JSON object, try to extract primary
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      return parsed.primary || parsed.couleur || parsed.color || null;
    } catch {
      return null;
    }
  }
  // Plain hex color
  if (trimmed.startsWith('#')) return trimmed;
  return null;
}

/**
 * Generate a full palette from a primary hex color.
 * Derives accent, secondary, background, and foreground colors.
 */
export function generatePalette(primaryHex: string): ChartPalette {
  const primary = primaryHex;
  const pRgb = hexToRgb(primary)!;
  const hsl = rgbToHsl(pRgb.r, pRgb.g, pRgb.b);

  // Accent: shift hue by ~150° (complementary-adjacent for a sophisticated feel)
  const accentHue = (hsl.h + 150) % 360;
  const accentRgb = hslToRgb(accentHue, Math.min(hsl.s + 5, 85), Math.min(hsl.l + 5, 55));
  const accent = rgbToHex(accentRgb.r, accentRgb.g, accentRgb.b);

  // Secondary: shift hue by ~30° (analogous, subtle)
  const secondaryHue = (hsl.h + 30) % 360;
  const secondaryRgb = hslToRgb(secondaryHue, Math.max(hsl.s - 20, 30), Math.min(hsl.l + 10, 60));
  const secondary = rgbToHex(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);

  const isLight = isLightColor(primary);
  const primaryLight = lighten(primary, 0.75);
  const primaryDark = darken(primary, 0.2);
  const primaryFg = isLight ? '#1a1817' : '#ffffff';

  return {
    primary,
    primaryR: pRgb.r,
    primaryG: pRgb.g,
    primaryB: pRgb.b,
    primaryLight,
    primaryDark,
    primaryFg,
    accent,
    accentR: accentRgb.r,
    accentG: accentRgb.g,
    accentB: accentRgb.b,
    accentLight: lighten(accent, 0.7),
    accentDark: darken(accent, 0.15),
    secondary,
    secondaryLight: lighten(secondary, 0.7),
    secondaryDark: darken(secondary, 0.15),
    background: '#faf8f5',
    backgroundR: 250,
    backgroundG: 248,
    backgroundB: 245,
    backgroundAlt: '#f5f1ec',
    foreground: '#1a1817',
    foregroundMuted: '#6b5e53',
    foregroundSubtle: '#a09080',
  };
}

/**
 * Generate CSS custom properties string from a palette.
 */
export function paletteToCssVars(palette: ChartPalette): string {
  return `:root {
  --chart-primary: ${palette.primary};
  --chart-primary-r: ${palette.primaryR};
  --chart-primary-g: ${palette.primaryG};
  --chart-primary-b: ${palette.primaryB};
  --chart-primary-light: ${palette.primaryLight};
  --chart-primary-dark: ${palette.primaryDark};
  --chart-primary-fg: ${palette.primaryFg};
  --chart-accent: ${palette.accent};
  --chart-accent-r: ${palette.accentR};
  --chart-accent-g: ${palette.accentG};
  --chart-accent-b: ${palette.accentB};
  --chart-accent-light: ${palette.accentLight};
  --chart-accent-dark: ${palette.accentDark};
  --chart-secondary: ${palette.secondary};
  --chart-secondary-light: ${palette.secondaryLight};
  --chart-secondary-dark: ${palette.secondaryDark};
  --chart-bg: ${palette.background};
  --chart-bg-r: ${palette.backgroundR};
  --chart-bg-g: ${palette.backgroundG};
  --chart-bg-b: ${palette.backgroundB};
  --chart-bg-alt: ${palette.backgroundAlt};
  --chart-fg: ${palette.foreground};
  --chart-fg-muted: ${palette.foregroundMuted};
  --chart-fg-subtle: ${palette.foregroundSubtle};
}`;
}