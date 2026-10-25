import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

function luminance(hex: string) {
  const [r, g, b] = hex.match(/[a-f0-9]{2}/gi)!.map((part) => {
    const value = parseInt(part, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe("teemojen luettavuus", () => {
  for (const selector of [":root", ':root[data-theme="dark"]']) {
    it(`${selector}: tavallisen tekstin kontrasti on vähintään 4,5:1`, () => {
      const block = css.slice(css.indexOf(`${selector} {`)).split("}")[0];
      const colors = Object.fromEntries([...block.matchAll(/--([\w-]+): (#[a-f0-9]{6})/g)].map((match) => [match[1], match[2]]));
      const pairs = [
        ...["text", "muted", "secondary", "positive", "negative"].flatMap((text) => ["surface", "page"].map((background) => [text, background])),
        ["chart-text", "chart-background"], ["selected-text", "text"],
      ];
      for (const [text, background] of pairs) {
        const values = [luminance(colors[text]), luminance(colors[background])].sort((a, b) => b - a);
        expect((values[0] + 0.05) / (values[1] + 0.05), `${text} / ${background}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
