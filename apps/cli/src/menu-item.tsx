import { Text } from "ink";
import { useColors } from "./theme-context.js";

interface MenuItemProps {
  label: string;
  detail: string;
  isSelected: boolean;
  recommended?: boolean;
  hint?: string;
}

export const MenuItem = ({ label, detail, isSelected, recommended, hint }: MenuItemProps) => {
  const COLORS = useColors();
  return (
    <Text>
      <Text color={isSelected ? COLORS.ORANGE : COLORS.DIM}>{isSelected ? "▶ " : "  "}</Text>
      <Text color={isSelected ? undefined : COLORS.DIM} bold={isSelected}>
        {label}
      </Text>
      {detail ? <Text color={COLORS.DIM}> {detail}</Text> : null}
      {recommended && <Text color={COLORS.DIM}> (recommended)</Text>}
      {hint && <Text color={COLORS.DIM}> ({hint})</Text>}
    </Text>
  );
};
