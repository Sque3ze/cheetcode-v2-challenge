/**
 * Classify a User-Agent string into a recognized automation tool.
 */
export function classifyAgent(userAgent: string): {
  tool: string;
  isHeadless: boolean;
  raw: string;
} {
  const ua = userAgent.toLowerCase();

  if (ua.includes("headlesschrome")) {
    if (ua.includes("playwright")) {
      return { tool: "Playwright (headless)", isHeadless: true, raw: userAgent };
    }
    return { tool: "Headless Chrome", isHeadless: true, raw: userAgent };
  }

  if (ua.includes("playwright")) {
    return { tool: "Playwright", isHeadless: false, raw: userAgent };
  }

  if (ua.includes("puppeteer")) {
    return { tool: "Puppeteer", isHeadless: true, raw: userAgent };
  }

  if (ua.includes("selenium") || ua.includes("webdriver")) {
    return { tool: "Selenium", isHeadless: false, raw: userAgent };
  }

  if (ua.includes("python-requests") || ua.includes("python-urllib")) {
    return { tool: "Python HTTP", isHeadless: true, raw: userAgent };
  }

  if (ua.includes("node-fetch") || ua.includes("undici")) {
    return { tool: "Node.js HTTP", isHeadless: true, raw: userAgent };
  }

  if (ua.includes("curl")) {
    return { tool: "cURL", isHeadless: true, raw: userAgent };
  }

  if (ua.includes("axios")) {
    return { tool: "Axios", isHeadless: true, raw: userAgent };
  }

  if (ua.includes("chrome") || ua.includes("chromium")) {
    return { tool: "Browser", isHeadless: false, raw: userAgent };
  }

  if (ua.includes("firefox")) {
    return { tool: "Browser", isHeadless: false, raw: userAgent };
  }

  if (ua.includes("safari") && !ua.includes("chrome")) {
    return { tool: "Browser", isHeadless: false, raw: userAgent };
  }

  return { tool: "Unknown", isHeadless: false, raw: userAgent };
}
