import { execSync } from "node:child_process";
import { highlighter } from "../utils/highlighter";
import { logger } from "../utils/logger";
import { prompts } from "../utils/prompts";
import { spinner } from "../utils/spinner";
import { isRunningInAgent } from "../utils/is-running-in-agent";
import { isHeadless } from "../utils/is-headless";

const SKILL_COMMAND = "npx skills add https://github.com/millionco/expect --skill expect-cli";

const detectNonInteractive = (yesFlag: boolean): boolean =>
  yesFlag || isRunningInAgent() || isHeadless();

const tryRun = (command: string): boolean => {
  try {
    execSync(command, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
};

export const runInit = async (options: { yes?: boolean } = {}) => {
  const nonInteractive = detectNonInteractive(options.yes ?? false);

  logger.break();
  logger.log(`  ${highlighter.info("expect")} ${highlighter.dim("— AI-powered browser testing")}`);
  logger.break();

  let installSkill = nonInteractive;

  if (!nonInteractive) {
    const response = await prompts({
      type: "confirm",
      name: "installSkill",
      message: `Install the ${highlighter.info("expect")} skill for your coding agent?`,
      initial: true,
    });
    installSkill = response.installSkill;
  }

  if (installSkill) {
    const installSpinner = spinner("Installing skill...").start();
    const success = tryRun(SKILL_COMMAND);

    if (success) {
      installSpinner.succeed("Skill installed.");
    } else {
      installSpinner.fail("Failed to install skill.");
      logger.break();
      logger.dim(`  Run manually: ${highlighter.info(SKILL_COMMAND)}`);
    }
  }

  logger.break();
  logger.success("You're all set!");
  logger.log(`  Run ${highlighter.info("expect")} in any project to start testing.`);
  logger.break();
};
