import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark";

interface UserThemeConfig {
  theme: Theme;
  globalPreset: string;
}

interface ThemeState {
  // ── NEW: Remembers the last used Light/Dark mode for the Login/Signup pages ──
  deviceTheme: Theme; 
  
  // Dictionary to store local cache for each user
  userConfigs: Record<string, UserThemeConfig>;
  
  // Actions
  toggleTheme: (userId: string | null) => void;
  setGlobalPreset: (userId: string, preset: string) => void;
  
  // ── NEW: Sync function to update local cache when Convex data arrives ──
  syncFromCloud: (userId: string, theme: Theme, preset: string) => void;
  
  // Helper to apply the CSS classes
  applyThemeToHTML: (userId: string | null) => void;
}

const DEFAULT_CONFIG: UserThemeConfig = { 
  theme: "dark", 
  globalPreset: "default" 
};

// ── Helper: Apply the CSS classes directly to the <html> tag ──
const updateDOM = (theme: Theme, preset: string) => {
  const html = document.documentElement;

  // 1. Handle Dark/Light Mode
  html.classList.toggle("dark", theme === "dark");

  // 2. Handle Global Preset Class
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
      deviceTheme: "dark", // Default start is dark
      userConfigs: {},

      toggleTheme: (userId: string | null) => {
        set((state) => {
          // ── CASE 1: LOGGED OUT (Login/Signup Page) ──
          if (!userId) {
            const nextTheme: Theme = state.deviceTheme === "dark" ? "light" : "dark";
            updateDOM(nextTheme, "default");
            return { deviceTheme: nextTheme };
          }

          // ── CASE 2: LOGGED IN ──
          const currentConfig: UserThemeConfig = state.userConfigs[userId] || DEFAULT_CONFIG;
          const nextTheme: Theme = currentConfig.theme === "dark" ? "light" : "dark";
          
          const updatedConfig: UserThemeConfig = {
            theme: nextTheme,
            globalPreset: currentConfig.globalPreset
          };

          updateDOM(nextTheme, currentConfig.globalPreset);
          
          return { 
            deviceTheme: nextTheme, // Save it as the device theme too! (For when they logout)
            userConfigs: {
              ...state.userConfigs,
              [userId]: updatedConfig
            } 
          };
        });
      },

      setGlobalPreset: (userId: string, preset: string) => {
        set((state) => {
          const currentConfig: UserThemeConfig = state.userConfigs[userId] || DEFAULT_CONFIG;
          
          const updatedConfig: UserThemeConfig = {
            theme: currentConfig.theme,
            globalPreset: preset
          };

          updateDOM(currentConfig.theme, preset);
          
          return { 
            userConfigs: {
              ...state.userConfigs,
              [userId]: updatedConfig
            } 
          };
        });
      },

      // ── NEW: Instantly update the local cache when backend data loads ──
      syncFromCloud: (userId: string, theme: Theme, preset: string) => {
        set((state) => {
          const updatedConfig: UserThemeConfig = { theme, globalPreset: preset };
          
          return {
            deviceTheme: theme, // Ensure device theme matches the cloud
            userConfigs: {
              ...state.userConfigs,
              [userId]: updatedConfig
            }
          };
        });
      },

      applyThemeToHTML: (userId: string | null) => {
        const state = get();
        
        // ── FIXED UX: Use 'deviceTheme' when logged out instead of forcing Dark Mode ──
        if (!userId) {
          updateDOM(state.deviceTheme, "default");
          return;
        }

        const config: UserThemeConfig = state.userConfigs[userId] || DEFAULT_CONFIG;
        updateDOM(config.theme, config.globalPreset);
      },
    }),
    {
      name: "lunex-themes-cloud-sync", // Renamed for a fresh start with the new logic
    }
  )
);