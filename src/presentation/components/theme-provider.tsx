"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";

/**
 * Theme root.
 *
 * `defaultTheme` is dark because that is the product's resting state — a
 * night-time listening surface — but "system" and "light" are real options,
 * not decoration.
 *
 * `disableTransitionOnChange` stops every colour-carrying element animating at
 * once when the theme flips, which otherwise reads as a full-screen flash.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      storageKey="sakina-theme"
    >
      {children}
    </NextThemeProvider>
  );
}
