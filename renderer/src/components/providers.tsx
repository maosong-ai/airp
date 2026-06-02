import { rendererConfig } from "@/config/renderer-config";
import { resolveInitialThemeMode } from "@/lib/preferences";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={resolveInitialThemeMode()}
      enableSystem
      storageKey={rendererConfig.storageKeys.themeMode}
    >
      {children}
    </NextThemesProvider>
  );
}
