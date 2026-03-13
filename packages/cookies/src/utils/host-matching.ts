import { stripLeadingDot } from "./strip-leading-dot.js";

export const hostMatchesCookieDomain = (host: string, cookieDomain: string): boolean => {
  const normalizedHost = host.toLowerCase();
  const domainLower = stripLeadingDot(cookieDomain).toLowerCase();
  return normalizedHost === domainLower || normalizedHost.endsWith(`.${domainLower}`);
};

export const hostMatchesAny = (hosts: string[], cookieDomain: string): boolean =>
  hosts.some((host) => hostMatchesCookieDomain(host, cookieDomain));

const toHostname = (origin: string): string => {
  try {
    return new URL(origin).hostname;
  } catch {
    return new URL(`https://${origin}`).hostname;
  }
};

export const originsToHosts = (origins: string[]): string[] => origins.map(toHostname);
