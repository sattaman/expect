import { describe, expect, it } from "vitest";

import { formatCookieHeader } from "../src/utils/format-cookie-header.js";
import type { Cookie } from "../src/types.js";

describe("formatCookieHeader", () => {
  const makeCookie = (name: string, value: string): Cookie => ({
    name,
    value,
    domain: "example.com",
    path: "/",
    secure: false,
    httpOnly: false,
    browser: "chrome",
  });

  it("formats a single cookie", () => {
    expect(formatCookieHeader([makeCookie("a", "1")])).toBe("a=1");
  });

  it("joins multiple cookies with semicolons", () => {
    const cookies = [makeCookie("a", "1"), makeCookie("b", "2")];
    expect(formatCookieHeader(cookies)).toBe("a=1; b=2");
  });

  it("returns empty string for no cookies", () => {
    expect(formatCookieHeader([])).toBe("");
  });

  it("preserves cookie values with special characters", () => {
    expect(formatCookieHeader([makeCookie("token", "abc=def/ghi")])).toBe("token=abc=def/ghi");
  });
});
