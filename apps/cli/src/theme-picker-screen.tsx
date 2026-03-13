import { useEffect, useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { THEMES, type ThemeDefinition } from "./themes.js";
import { useColors, useThemeContext } from "./theme-context.js";
import { THEME_PICKER_VISIBLE_COUNT } from "./constants.js";
import { saveThemeName } from "./utils/load-theme.js";

interface ThemePickerScreenProps {
  onBack: () => void;
}

const THEME_NAMES = Object.keys(THEMES);

const ThemeSwatch = ({ theme }: { theme: ThemeDefinition }) => (
  <Text>
    <Text color={theme.primary}>{"\u25A0"}</Text>
    <Text color={theme.secondary}>{"\u25A0"}</Text>
    <Text color={theme.accent}>{"\u25A0"}</Text>
    <Text color={theme.success}>{"\u25A0"}</Text>
  </Text>
);

export const ThemePickerScreen = ({ onBack }: ThemePickerScreenProps) => {
  const { themeName, setTheme } = useThemeContext();
  const colors = useColors();
  const [previousTheme] = useState(themeName);
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const index = THEME_NAMES.indexOf(themeName);
    return index >= 0 ? index : 0;
  });

  useEffect(() => {
    const nextTheme = THEME_NAMES[selectedIndex];
    if (nextTheme) setTheme(nextTheme);
  }, [selectedIndex, setTheme]);

  const scrollOffset = useMemo(() => {
    if (THEME_NAMES.length <= THEME_PICKER_VISIBLE_COUNT) return 0;
    const half = Math.floor(THEME_PICKER_VISIBLE_COUNT / 2);
    const maxOffset = THEME_NAMES.length - THEME_PICKER_VISIBLE_COUNT;
    return Math.min(maxOffset, Math.max(0, selectedIndex - half));
  }, [selectedIndex]);

  const visibleThemes = THEME_NAMES.slice(scrollOffset, scrollOffset + THEME_PICKER_VISIBLE_COUNT);

  useInput((input, key) => {
    if (key.downArrow || input === "j" || (key.ctrl && input === "n")) {
      setSelectedIndex((previous) => Math.min(THEME_NAMES.length - 1, previous + 1));
    }
    if (key.upArrow || input === "k" || (key.ctrl && input === "p")) {
      setSelectedIndex((previous) => Math.max(0, previous - 1));
    }
    if (key.return) {
      const selected = THEME_NAMES[selectedIndex];
      if (selected) saveThemeName(selected);
      onBack();
    }
    if (key.escape) {
      setTheme(previousTheme);
      onBack();
    }
  });

  return (
    <Box flexDirection="column" width="100%" paddingX={1} paddingY={1}>
      <Text bold color={colors.TEXT || undefined}>
        Select theme
      </Text>
      <Text color={colors.DIM}>{THEME_NAMES.length} themes available</Text>

      <Box
        marginTop={1}
        flexDirection="column"
        height={THEME_PICKER_VISIBLE_COUNT}
        overflow="hidden"
      >
        {visibleThemes.map((name, index) => {
          const actualIndex = index + scrollOffset;
          const theme = THEMES[name];
          if (!theme) return null;
          const isSelected = actualIndex === selectedIndex;
          return (
            <Text key={name}>
              <Text color={isSelected ? colors.ORANGE : colors.DIM}>
                {isSelected ? "\u25B6 " : "  "}
              </Text>
              <ThemeSwatch theme={theme} />
              <Text> </Text>
              <Text color={isSelected ? undefined : colors.DIM} bold={isSelected}>
                {theme.name}
              </Text>
            </Text>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text color={colors.DIM}>
          {"\u2191/\u2193"} navigate {"\u00B7"} Enter select {"\u00B7"} Esc cancel
        </Text>
      </Box>
    </Box>
  );
};
