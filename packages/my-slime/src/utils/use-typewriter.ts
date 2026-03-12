import { useEffect, useRef, useState } from "react";

interface TypewriterChar {
  char: string;
  color: string;
}

const CHAR_STAGGER = 2;

const getMaxProgress = (textLength: number, shadeCount: number): number =>
  Math.max(0, (textLength - 1) * CHAR_STAGGER + shadeCount - 1);

export const useTypewriter = (
  text: string,
  shadeColors: readonly string[],
  tickIntervalMs: number,
  initiallyVisible = false,
): TypewriterChar[] => {
  const maxInitial = initiallyVisible ? getMaxProgress(text.length, shadeColors.length) : 0;
  const [progress, setProgress] = useState(maxInitial);
  const [isAnimating, setIsAnimating] = useState(!initiallyVisible);
  const [displayText, setDisplayText] = useState(text);
  const previousTextRef = useRef(text);

  useEffect(() => {
    if (text === previousTextRef.current) return;
    previousTextRef.current = text;
    setDisplayText(text);
    setProgress(0);
    setIsAnimating(text.length > 0);
  }, [text]);

  useEffect(() => {
    if (!isAnimating) return;

    const maxProgress = getMaxProgress(displayText.length, shadeColors.length);

    const interval = setInterval(() => {
      setProgress((previous) => {
        const next = previous + 1;
        if (next >= maxProgress) {
          setIsAnimating(false);
          return maxProgress;
        }
        return next;
      });
    }, tickIntervalMs);

    return () => clearInterval(interval);
  }, [isAnimating, displayText, tickIntervalMs, shadeColors.length]);

  const chars: TypewriterChar[] = [];
  for (let index = 0; index < displayText.length; index++) {
    const charProgress = progress - index * CHAR_STAGGER;
    if (charProgress < 0) break;
    const shadeIndex = Math.min(shadeColors.length - 1, charProgress);
    chars.push({ char: displayText[index], color: shadeColors[shadeIndex] });
  }

  return chars;
};

export type { TypewriterChar };
