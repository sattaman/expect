export interface Colors {
  TEXT: string;
  DIM: string;
  GREEN: string;
  PRIMARY: string;
  SELECTION: string;
  RED: string;
  BORDER: string;
  DIVIDER: string;
  YELLOW: string;
  PURPLE: string;
  CYAN: string;
}

interface Theme {
  primary: string;
  secondary: string;
  accent: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  text: string;
  textMuted: string;
  border: string;
  borderActive: string;
  borderSubtle: string;
}

const darkTheme: Theme = {
  primary: "#FFFFFF",
  secondary: "#B0B0B0",
  accent: "#D0D0D0",
  error: "#E05555",
  warning: "#CCAA33",
  success: "#5EA55E",
  info: "#909090",
  text: "#E0E0E0",
  textMuted: "#707070",
  border: "#505050",
  borderActive: "#909090",
  borderSubtle: "#303030",
};

const lightTheme: Theme = {
  primary: "#000000",
  secondary: "#505050",
  accent: "#404040",
  error: "#CC3333",
  warning: "#997700",
  success: "#2E7D2E",
  info: "#707070",
  text: "#1A1A1A",
  textMuted: "#808080",
  border: "#C0C0C0",
  borderActive: "#707070",
  borderSubtle: "#E0E0E0",
};

const detectLightTerminal = (): boolean => {
  const explicit = process.env["EXPECT_THEME"];
  if (explicit === "light") return true;
  if (explicit === "dark") return false;

  const colorFgBg = process.env["COLORFGBG"];
  if (colorFgBg) {
    const parts = colorFgBg.split(";");
    const background = Number.parseInt(parts[parts.length - 1] ?? "", 10);
    if (!Number.isNaN(background)) {
      return background >= 8;
    }
  }

  return false;
};

const isLight = detectLightTerminal();

export const theme: Theme = isLight ? lightTheme : darkTheme;

const colorsFromTheme = (source: Theme): Colors => ({
  TEXT: source.text,
  DIM: source.textMuted,
  GREEN: source.success,
  PRIMARY: source.primary,
  SELECTION: source.accent,
  RED: source.error,
  BORDER: source.border,
  DIVIDER: source.borderSubtle,
  YELLOW: source.warning,
  PURPLE: source.secondary,
  CYAN: source.info,
});

export const COLORS: Colors = colorsFromTheme(theme);

export const useColors = (): Colors => COLORS;
