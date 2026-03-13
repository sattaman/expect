import type { Cookie } from "../types.js";

export const formatCookieHeader = (cookies: Cookie[]): string =>
  cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
