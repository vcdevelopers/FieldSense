import { safeLocalStorage } from '../utils/storage';
import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  isDark: false,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTheme = urlParams.get('theme');
    if (urlTheme === 'dark' || urlTheme === 'light') return urlTheme as Theme;
    return (safeLocalStorage.getItem(storageKey) as Theme) || defaultTheme;
  });
  
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'THEME_CHANGE') {
        const newTheme = event.data.theme as Theme;
        if (newTheme === 'dark' || newTheme === 'light') {
          setTheme(newTheme);
          safeLocalStorage.setItem(storageKey, newTheme);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      setIsDark(systemTheme === "dark");
      return;
    }

    root.classList.add(theme);
    setIsDark(theme === "dark");
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      safeLocalStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    isDark,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
