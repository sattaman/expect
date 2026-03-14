import stringWidth from "string-width";

export const visualPadEnd = (value: string, targetWidth: number): string => {
  const padding = Math.max(0, targetWidth - stringWidth(value));
  return value + " ".repeat(padding);
};
