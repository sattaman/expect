import { Text } from "ink";
import { useColors } from "./theme-context.js";

export type PrFilter = "all" | "open" | "draft" | "merged" | "no-pr";

export const PR_FILTERS: PrFilter[] = ["all", "open", "draft", "merged", "no-pr"];

interface PrFilterBarProps {
  activeFilter: PrFilter;
}

export const PrFilterBar = ({ activeFilter }: PrFilterBarProps) => {
  const COLORS = useColors();

  const filterColors: Record<PrFilter, string> = {
    all: COLORS.TEXT,
    open: COLORS.GREEN,
    draft: COLORS.DIM,
    merged: COLORS.PURPLE,
    "no-pr": COLORS.YELLOW,
  };

  return (
    <Text color={COLORS.DIM}>
      {PR_FILTERS.map((filter, index) => {
        const isActive = filter === activeFilter;
        const separator = index < PR_FILTERS.length - 1 ? "  " : "";
        return (
          <Text key={filter}>
            <Text color={isActive ? filterColors[filter] : COLORS.DIM}>
              {isActive ? `[${filter}]` : ` ${filter} `}
            </Text>
            {separator}
          </Text>
        );
      })}
    </Text>
  );
};
