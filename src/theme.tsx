import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "market-monitor-theme";
const ThemeContext = createContext({ theme: "dark" as Theme, toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Teeman vaihtaminen toimii myös ilman selaimen tallennustilaa.
    }
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme((value) => value === "light" ? "dark" : "light") }}>
    {children}
  </ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

export function getChartColors() {
  const style = getComputedStyle(document.documentElement);
  const color = (name: string) => style.getPropertyValue(`--${name}`).trim();
  return {
    background: color("chart-background"), text: color("chart-text"),
    grid: color("chart-grid"), border: color("chart-border"),
    reference: color("muted"), ratio: color("negative"),
    lines: Object.fromEntries(["gspc", "ndx", "rut", "dji", "sp500ew", "vix"].map((key) => [key, color(`line-${key}`)])),
  };
}
