import { describe, expect, it } from "vitest";
import { naturalCompare } from "../src/utils/natural-sort.js";

describe("naturalCompare", () => {
  it("sorts strings without numbers alphabetically", () => {
    expect(naturalCompare("Default", "Default")).toBe(0);
    expect(naturalCompare("Alpha", "Beta")).toBeLessThan(0);
    expect(naturalCompare("Beta", "Alpha")).toBeGreaterThan(0);
  });

  it("sorts by leading number", () => {
    expect(naturalCompare("Profile 1", "Profile 2")).toBeLessThan(0);
    expect(naturalCompare("Profile 10", "Profile 2")).toBeGreaterThan(0);
    expect(naturalCompare("Profile 2", "Profile 10")).toBeLessThan(0);
  });

  it("sorts equal numbers by string comparison", () => {
    expect(naturalCompare("Profile 1", "Profile 1")).toBe(0);
    expect(naturalCompare("1a", "1b")).toBeLessThan(0);
  });

  it("treats strings without digits as zero", () => {
    expect(naturalCompare("Default", "Profile 1")).toBeLessThan(0);
    expect(naturalCompare("Default", "Default")).toBe(0);
  });

  it("handles empty strings", () => {
    expect(naturalCompare("", "")).toBe(0);
    expect(naturalCompare("", "Profile 1")).toBeLessThan(0);
  });

  it("sorts a realistic profile list correctly", () => {
    const profiles = ["Profile 10", "Profile 2", "Default", "Profile 1", "Profile 3"];
    const sorted = [...profiles].sort(naturalCompare);
    expect(sorted).toEqual(["Default", "Profile 1", "Profile 2", "Profile 3", "Profile 10"]);
  });
});
