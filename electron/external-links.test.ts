import { expect, it } from "vitest";
import { isAllowedExternalUrl } from "./external-links.mjs";

it("allows the chart attribution website and rejects other OS navigation targets", () => {
  expect(isAllowedExternalUrl("https://www.tradingview.com/?utm_source=chart")).toBe(true);
  for (const url of ["file:///C:/Windows/System32/cmd.exe", "javascript:alert(1)", "http://www.tradingview.com/", "https://www.tradingview.com.evil.test/", "https://evil.test/", "https://user:password@www.tradingview.com/", "https://www.tradingview.com:8443/"]) {
    expect(isAllowedExternalUrl(url)).toBe(false);
  }
});
