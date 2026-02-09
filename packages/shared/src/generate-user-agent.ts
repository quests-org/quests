import os from "node:os";
import { draw } from "radashi";
import topUserAgents from "top-user-agents/desktop";

// Attempt to generate a user agent that is compatible with the Chrome browser.
// Avoids possible rate limiting for embedded images etc.
export function generateUserAgent(): string | undefined {
  const platformId = getPlatformIdentifier();

  // Tier 1: Match both platform and Chrome
  if (platformId) {
    const platformChromeMatch = topUserAgents.find(
      (ua) => ua.includes(platformId) && ua.includes("Chrome/"),
    );
    if (platformChromeMatch) {
      return platformChromeMatch;
    }
  }

  // Tier 2: Match Chrome only
  const chromeMatch = topUserAgents.find((ua) => ua.includes("Chrome/"));
  if (chromeMatch) {
    return chromeMatch;
  }

  // Tier 3: Fallback to random selection
  return draw(topUserAgents) ?? undefined;
}

function getPlatformIdentifier(): string {
  if (os.platform() === "darwin") {
    return "Macintosh";
  }
  if (os.platform() === "linux") {
    return "X11";
  }
  if (os.platform() === "win32") {
    return "Windows NT";
  }
  return "";
}
