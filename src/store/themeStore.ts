//src/store/themeStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark";

interface UserThemeConfig {
  theme: Theme;
  globalPreset: string;
}

interface ThemeState {
  deviceTheme: Theme;
  userConfigs: Record<string, UserThemeConfig>;

  toggleTheme: (userId: string | null) => void;
  setGlobalPreset: (userId: string, preset: string) => void;

  syncFromCloud: (userId: string, theme: Theme, preset: string) => void;

  applyThemeToHTML: (userId: string | null) => void;
}

const DEFAULT_CONFIG: UserThemeConfig = {
  theme: "dark",
  globalPreset: "default",
};

const updateDOM = (theme: Theme, preset: string) => {
  const html = document.documentElement;

  html.classList.toggle("dark", theme === "dark");

  html.classList.forEach((className) => {
    if (className.startsWith("global-theme-")) {
      html.classList.remove(className);
    }
  });

  if (preset !== "default") {
    html.classList.add(`global-theme-${preset}`);
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      deviceTheme: "dark",
      userConfigs: {},

      toggleTheme: (userId: string | null) => {
        set((state) => {
          if (!userId) {
            const nextTheme: Theme =
              state.deviceTheme === "dark" ? "light" : "dark";
            updateDOM(nextTheme, "default");
            return { deviceTheme: nextTheme };
          }

          const currentConfig: UserThemeConfig =
            state.userConfigs[userId] || DEFAULT_CONFIG;
          const nextTheme: Theme =
            currentConfig.theme === "dark" ? "light" : "dark";

          const updatedConfig: UserThemeConfig = {
            theme: nextTheme,
            globalPreset: currentConfig.globalPreset,
          };

          updateDOM(nextTheme, currentConfig.globalPreset);

          return {
            deviceTheme: nextTheme,
            userConfigs: {
              ...state.userConfigs,
              [userId]: updatedConfig,
            },
          };
        });
      },

      setGlobalPreset: (userId: string, preset: string) => {
        set((state) => {
          const currentConfig: UserThemeConfig =
            state.userConfigs[userId] || DEFAULT_CONFIG;

          const updatedConfig: UserThemeConfig = {
            theme: currentConfig.theme,
            globalPreset: preset,
          };

          updateDOM(currentConfig.theme, preset);

          return {
            userConfigs: {
              ...state.userConfigs,
              [userId]: updatedConfig,
            },
          };
        });
      },

      syncFromCloud: (userId: string, theme: Theme, preset: string) => {
        set((state) => {
          const updatedConfig: UserThemeConfig = {
            theme,
            globalPreset: preset,
          };

          return {
            deviceTheme: theme,
            userConfigs: {
              ...state.userConfigs,
              [userId]: updatedConfig,
            },
          };
        });
      },

      applyThemeToHTML: (userId: string | null) => {
        const state = get();

        if (!userId) {
          updateDOM(state.deviceTheme, "default");
          return;
        }

        const config: UserThemeConfig =
          state.userConfigs[userId] || DEFAULT_CONFIG;
        updateDOM(config.theme, config.globalPreset);
      },
    }),
    {
      name: "lunex-themes-cloud-sync",
    },
  ),
);
