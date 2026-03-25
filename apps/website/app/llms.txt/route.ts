import { readFileSync } from "fs";
import { NextResponse } from "next/server";
import { join } from "path";

const skill = readFileSync(
  join(process.cwd(), "..", "..", "packages", "expect-skill", "SKILL.md"),
  "utf-8",
);

export const GET = () =>
  new NextResponse(skill, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
