import { chromium } from "playwright";
import { HEADLESS_CHROMIUM_ARGS } from "./constants";
import { injectCookies } from "./inject-cookies";
import type { CreatePageOptions, CreatePageResult } from "./types";

export const createPage = async (
  url: string,
  options: CreatePageOptions = {},
): Promise<CreatePageResult> => {
  const browser = await chromium.launch({
    headless: !options.headed,
    executablePath: options.executablePath,
    args: HEADLESS_CHROMIUM_ARGS,
  });

  try {
    const context = await browser.newContext();

    if (options.cookies) {
      await injectCookies(context, { url });
    }

    const page = await context.newPage();
    await page.goto(url, { waitUntil: options.waitUntil ?? "load" });

    return { browser, context, page };
  } catch (error) {
    await browser.close();
    throw error;
  }
};
