import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useColors } from "./theme-context.js";
import type { TestAction } from "./utils/browser-agent.js";

interface FlowInputScreenProps {
  action: TestAction;
  initialValue: string;
  onSubmit: (value: string) => void;
}

const ACTION_LABELS: Record<TestAction, string> = {
  "test-unstaged": "unstaged changes",
  "test-branch": "branch changes",
  "select-commit": "selected commit",
};

export const FlowInputScreen = ({ action, initialValue, onSubmit }: FlowInputScreenProps) => {
  const COLORS = useColors();
  const [value, setValue] = useState(initialValue);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useInput((_input, key) => {
    if (!key.return) return;
    if (!value.trim()) {
      setErrorMessage("Describe the user flow you want the browser agent to test.");
      return;
    }

    onSubmit(value.trim());
  });

  return (
    <Box flexDirection="column" width="100%" paddingX={2} paddingY={1}>
      <Text bold color={COLORS.TEXT}>
        Describe the browser flow to test
      </Text>
      <Text color={COLORS.DIM}>Target: {ACTION_LABELS[action]}</Text>

      <Box
        marginTop={1}
        borderStyle="single"
        borderTop
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
        borderColor={COLORS.DIVIDER}
      />

      <Box marginTop={1} flexDirection="column">
        <Text color={COLORS.TEXT}>
          Example: Go through onboarding at /onboarding, click Import Projects, and verify the
          imported project list appears.
        </Text>
      </Box>

      <Box marginTop={2} borderStyle="round" borderColor={COLORS.BORDER} paddingX={2}>
        <TextInput
          focus
          placeholder="Describe the flow ..."
          value={value}
          onChange={(nextValue) => {
            setValue(nextValue);
            if (errorMessage) setErrorMessage(null);
          }}
        />
      </Box>

      {errorMessage ? (
        <Box marginTop={1}>
          <Text color={COLORS.RED}>{errorMessage}</Text>
        </Box>
      ) : null}

      <Box marginTop={1}>
        <Text color={COLORS.DIM}>Enter plan flow · Esc back</Text>
      </Box>
    </Box>
  );
};
