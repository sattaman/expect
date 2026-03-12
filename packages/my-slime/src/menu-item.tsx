import { COLORS, DETAIL_TYPEWRITER_TICK_MS, NUMBER_OPTION_GAP, SELECTED_INDICATOR, TYPEWRITER_SHADES } from "./constants";
import { useTypewriter } from "./utils/use-typewriter";

interface MenuItemProps {
  index: number;
  label: string;
  detail: string;
  isSelected: boolean;
}

const DetailText = ({ detail, isSelected }: { detail: string; isSelected: boolean }) => {
  const detailChars = useTypewriter(isSelected ? ` ${detail}` : "", TYPEWRITER_SHADES, DETAIL_TYPEWRITER_TICK_MS);

  if (detailChars.length === 0) return null;

  return (
    <>
      {detailChars.map((charState, charIndex) => (
        <span key={charIndex} fg={charState.color}>{charState.char}</span>
      ))}
    </>
  );
};

const DiffDetail = ({ isSelected }: { isSelected: boolean }) => {
  const detailChars = useTypewriter(
    isSelected ? " [ +44 -23 · 2 files ]" : "",
    TYPEWRITER_SHADES,
    DETAIL_TYPEWRITER_TICK_MS,
    true,
  );

  if (detailChars.length === 0) return null;

  const detailString = detailChars.map((charState) => charState.char).join("");
  const maxShade = TYPEWRITER_SHADES[TYPEWRITER_SHADES.length - 1];

  return (
    <>
      {detailChars.map((charState, charIndex) => {
        const char = charState.char;
        const fullText = " [ +44 -23 · 2 files ]";
        const position = detailString.length - detailChars.length + charIndex;
        const globalIndex = fullText.indexOf(char, Math.max(0, position));

        let color = charState.color;
        if (charState.color === maxShade) {
          if (globalIndex >= 3 && globalIndex <= 5) color = COLORS.GREEN;
          else if (globalIndex >= 7 && globalIndex <= 9) color = COLORS.RED;
          else color = COLORS.TEXT;
        }

        return <span key={charIndex} fg={color}>{char}</span>;
      })}
    </>
  );
};

export const MenuItem = ({ index, label, detail, isSelected }: MenuItemProps) => {
  const number = `${index + 1}`;

  return (
    <text fg={COLORS.TEXT}>
      <span fg={isSelected ? COLORS.SELECTION : COLORS.TEXT}>
        {isSelected ? `${SELECTED_INDICATOR} ` : "  "}
      </span>
      <span>{number}{NUMBER_OPTION_GAP}</span>
      <span fg={isSelected ? COLORS.SELECTION : COLORS.TEXT}>{label}</span>
      {index === 0 ? (
        <DiffDetail isSelected={isSelected} />
      ) : detail ? (
        <DetailText detail={detail} isSelected={isSelected} />
      ) : null}
    </text>
  );
};
