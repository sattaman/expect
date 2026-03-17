import { Cookie } from "@browser-tester/cookies";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_VIDEO_HEIGHT_PX, DEFAULT_VIDEO_WIDTH_PX } from "../src/constants";

const { injectCookiesMock, launchMock, newContextMock, newPageMock, gotoMock, closeMock } =
  vi.hoisted(() => ({
    injectCookiesMock: vi.fn(),
    launchMock: vi.fn(),
    newContextMock: vi.fn(),
    newPageMock: vi.fn(),
    gotoMock: vi.fn(),
    closeMock: vi.fn(),
  }));

vi.mock("playwright", () => ({
  chromium: {
    launch: launchMock,
  },
}));

vi.mock("../src/inject-cookies", () => ({
  injectCookies: injectCookiesMock,
}));

import { createPage } from "../src/create-page";

const testCookies: Cookie[] = [
  Cookie.make({
    name: "__Host-session",
    value: "profile-cookie",
    domain: "github.com",
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "Strict",
  }),
];

describe("createPage video recording", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    gotoMock.mockResolvedValue(undefined);
    newPageMock.mockResolvedValue({ goto: gotoMock });
    newContextMock.mockResolvedValue({ newPage: newPageMock });
    closeMock.mockResolvedValue(undefined);
    launchMock.mockResolvedValue({
      newContext: newContextMock,
      close: closeMock,
    });
  });

  it("uses the default HD recording size when video is enabled", async () => {
    await createPage("https://example.com", { video: true });

    expect(newContextMock).toHaveBeenCalledWith({
      recordVideo: {
        dir: expect.any(String),
        size: {
          width: DEFAULT_VIDEO_WIDTH_PX,
          height: DEFAULT_VIDEO_HEIGHT_PX,
        },
      },
    });
  });

  it("preserves an explicit recording size", async () => {
    await createPage("https://example.com", {
      video: {
        dir: "/tmp/videos",
        size: {
          width: 1920,
          height: 1080,
        },
      },
    });

    expect(newContextMock).toHaveBeenCalledWith({
      recordVideo: {
        dir: "/tmp/videos",
        size: {
          width: 1920,
          height: 1080,
        },
      },
    });
  });

  it("fills in the default recording size when only a directory is provided", async () => {
    await createPage("https://example.com", {
      video: {
        dir: "/tmp/videos",
      },
    });

    expect(newContextMock).toHaveBeenCalledWith({
      recordVideo: {
        dir: "/tmp/videos",
        size: {
          width: DEFAULT_VIDEO_WIDTH_PX,
          height: DEFAULT_VIDEO_HEIGHT_PX,
        },
      },
    });
  });

  it("injects explicit cookies when provided as an array", async () => {
    injectCookiesMock.mockResolvedValue(undefined);

    await createPage("https://github.com", { cookies: testCookies });

    expect(injectCookiesMock).toHaveBeenCalledWith(expect.anything(), testCookies);
  });
});
