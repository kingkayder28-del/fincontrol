/**
 * Organization Theme & Color Management
 */

// Predefined color themes for organizations
export const THEME_COLORS = {
  blue: {
    primary: '#3b82f6',
    accent: '#1e40af',
    light: '#dbeafe',
    dark: '#1e3a8a',
    name: 'Blue'
  },
  emerald: {
    primary: '#10b981',
    accent: '#059669',
    light: '#d1fae5',
    dark: '#064e3b',
    name: 'Emerald'
  },
  purple: {
    primary: '#8b5cf6',
    accent: '#7c3aed',
    light: '#ede9fe',
    dark: '#4c1d95',
    name: 'Purple'
  },
  amber: {
    primary: '#f59e0b',
    accent: '#d97706',
    light: '#fef3c7',
    dark: '#78350f',
    name: 'Amber'
  },
  rose: {
    primary: '#f43f5e',
    accent: '#e11d48',
    light: '#ffe4e6',
    dark: '#500724',
    name: 'Rose'
  },
  indigo: {
    primary: '#6366f1',
    accent: '#4f46e5',
    light: '#e0e7ff',
    dark: '#312e81',
    name: 'Indigo'
  },
  teal: {
    primary: '#14b8a6',
    accent: '#0d9488',
    light: '#ccfbf1',
    dark: '#0f766e',
    name: 'Teal'
  },
  cyan: {
    primary: '#06b6d4',
    accent: '#0891b2',
    light: '#cffafe',
    dark: '#164e63',
    name: 'Cyan'
  },
  pink: {
    primary: '#ec4899',
    accent: '#db2777',
    light: '#fce7f3',
    dark: '#500724',
    name: 'Pink'
  },
  orange: {
    primary: '#f97316',
    accent: '#ea580c',
    light: '#ffedd5',
    dark: '#7c2d12',
    name: 'Orange'
  },
  lime: {
    primary: '#84cc16',
    accent: '#65a30d',
    light: '#ecfdf5',
    dark: '#365314',
    name: 'Lime'
  },
  slate: {
    primary: '#64748b',
    accent: '#475569',
    light: '#f1f5f9',
    dark: '#1e293b',
    name: 'Slate'
  }
} as const;

export type ThemeColorKey = keyof typeof THEME_COLORS;

/**
 * Get theme color object by key or hex code
 */
export function getThemeColor(colorKey: string): typeof THEME_COLORS[ThemeColorKey] {
  if (colorKey in THEME_COLORS) {
    return THEME_COLORS[colorKey as ThemeColorKey];
  }
  
  // Default to blue if not found
  return THEME_COLORS.blue;
}

/**
 * Find theme key by primary color hex
 */
export function getThemeKeyByPrimaryColor(hexColor: string): ThemeColorKey {
  for (const [key, theme] of Object.entries(THEME_COLORS)) {
    if (theme.primary.toLowerCase() === hexColor.toLowerCase()) {
      return key as ThemeColorKey;
    }
  }
  return 'blue';
}

/**
 * Apply organization theme to document
 */
export function applyOrgTheme(themeColor: string = '#3b82f6', accentColor: string = '#1e40af') {
  const root = document.documentElement;

  root.style.setProperty('--org-primary', themeColor);
  root.style.setProperty('--org-accent', accentColor);
  root.style.setProperty('--brand', themeColor);
  root.style.setProperty('--brand-strong', darkenColor(themeColor, 18));
  root.style.setProperty('--brand-soft', lightenColor(themeColor, 82));
  root.style.setProperty('--brand-ink', getContrastColor(themeColor));

  root.style.setProperty('--brand-stroke', `${themeColor}22`);
}

/**
 * Reset theme to default
 */
export function resetOrgTheme() {
  applyOrgTheme('#3b82f6', '#1e40af');
}

/**
 * Get all available theme colors
 */
export function getAvailableThemes() {
  return Object.entries(THEME_COLORS).map(([key, theme]) => ({
    key: key as ThemeColorKey,
    ...theme
  }));
}

/**
 * Get contrasting text color for background (white or black)
 */
export function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Convert hex to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Generate light variant of color
 */
export function lightenColor(hex: string, percent: number = 20): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const r = Math.min(255, rgb.r + (255 - rgb.r) * (percent / 100));
  const g = Math.min(255, rgb.g + (255 - rgb.g) * (percent / 100));
  const b = Math.min(255, rgb.b + (255 - rgb.b) * (percent / 100));
  
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}

/**
 * Generate dark variant of color
 */
export function darkenColor(hex: string, percent: number = 20): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const r = Math.max(0, rgb.r - rgb.r * (percent / 100));
  const g = Math.max(0, rgb.g - rgb.g * (percent / 100));
  const b = Math.max(0, rgb.b - rgb.b * (percent / 100));
  
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}
