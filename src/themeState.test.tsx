import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "./theme";

function ThemeReading() {
  return <span>{useTheme().theme}</span>;
}

function initialTheme() {
  return renderToStaticMarkup(<ThemeProvider><ThemeReading /></ThemeProvider>);
}

afterEach(() => vi.unstubAllGlobals());

describe("teeman oletus ja tallennettu valinta", () => {
  it.each([null, "dark", "invalid"])("käyttää tummaa tilaa tallennetulla arvolla %s", (value) => {
    vi.stubGlobal("localStorage", { getItem: () => value });
    expect(initialTheme()).toBe("<span>dark</span>");
  });

  it("säilyttää käyttäjän valitseman vaalean tilan", () => {
    vi.stubGlobal("localStorage", { getItem: () => "light" });
    expect(initialTheme()).toBe("<span>light</span>");
  });

  it("käyttää tummaa tilaa myös tallennustilan ollessa estetty", () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("Tallennustila estetty"); } });
    expect(initialTheme()).toBe("<span>dark</span>");
  });
});
