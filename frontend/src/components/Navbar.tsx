import { NavLink } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const firstName = user?.name ? user.name.trim().split(" ")[0] : "Chef";

  return (
    <header className="border-b-1.5 border-[#2B2118] dark:border-[#4E4238] bg-[#F6F0E4]/90 dark:bg-[#1E1915]/90 sticky top-0 z-40 backdrop-blur-[1px]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <NavLink to="/" className="flex items-baseline gap-2 group">
          <span className="font-serif text-2xl font-bold tracking-tight text-[#2B2118] dark:text-[#EFE7DA]">
            RecipeGenie
          </span>
          <span className="font-handwriting text-sm text-[#B5502F] dark:text-[#D98E04] hidden sm:inline -rotate-2">
            kitchen notebook
          </span>
        </NavLink>

        {/* Text Navigation, Auth Actions & Dark Mode Toggle */}
        <div className="flex items-center gap-4 sm:gap-6">
          <nav className="flex items-center gap-3 sm:gap-6 text-sm font-medium">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `text-[#2B2118] dark:text-[#EFE7DA] transition-colors py-1 relative ${
                  isActive
                    ? "border-b-2 border-[#2B2118] dark:border-[#D98E04] font-semibold"
                    : "hover:border-b-2 hover:border-[#2B2118]/60 dark:hover:border-[#EFE7DA]/60"
                }`
              }
            >
              Generate
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `text-[#2B2118] dark:text-[#EFE7DA] transition-colors py-1 relative ${
                  isActive
                    ? "border-b-2 border-[#2B2118] dark:border-[#D98E04] font-semibold"
                    : "hover:border-b-2 hover:border-[#2B2118]/60 dark:hover:border-[#EFE7DA]/60"
                }`
              }
            >
              History
            </NavLink>
            <NavLink
              to="/favorites"
              className={({ isActive }) =>
                `text-[#2B2118] dark:text-[#EFE7DA] transition-colors py-1 relative ${
                  isActive
                    ? "border-b-2 border-[#2B2118] dark:border-[#D98E04] font-semibold"
                    : "hover:border-b-2 hover:border-[#2B2118]/60 dark:hover:border-[#EFE7DA]/60"
                }`
              }
            >
              Favorites
            </NavLink>
          </nav>

          {/* User Status / Auth Links */}
          <div className="flex items-center gap-3 sm:gap-4 pl-3 sm:pl-4 border-l border-[#2B2118]/30 dark:border-[#4E4238] text-xs sm:text-sm">
            {user ? (
              <div className="flex items-center gap-2.5 sm:gap-3">
                <span className="font-handwriting text-base text-[#B5502F] dark:text-[#D98E04] -rotate-1 select-none">
                  Chef {firstName}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="text-xs font-mono uppercase tracking-wider text-[#2B2118]/70 dark:text-[#EFE7DA]/70 hover:text-[#B5502F] dark:hover:text-[#D98E04] transition-colors underline-offset-4 hover:underline"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 sm:gap-4 font-medium">
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    `text-[#2B2118] dark:text-[#EFE7DA] transition-colors py-1 relative ${
                      isActive
                        ? "border-b-2 border-[#2B2118] dark:border-[#D98E04] font-semibold"
                        : "hover:border-b-2 hover:border-[#2B2118]/60 dark:hover:border-[#EFE7DA]/60"
                    }`
                  }
                >
                  Sign in
                </NavLink>
                <NavLink
                  to="/register"
                  className={({ isActive }) =>
                    `text-[#2B2118] dark:text-[#EFE7DA] transition-colors py-1 relative ${
                      isActive
                        ? "border-b-2 border-[#2B2118] dark:border-[#D98E04] font-semibold"
                        : "hover:border-b-2 hover:border-[#2B2118]/60 dark:hover:border-[#EFE7DA]/60"
                    }`
                  }
                >
                  Register
                </NavLink>
              </div>
            )}

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              className="p-1.5 rounded-[4px_6px_5px_4px] border-1.5 border-[#2B2118] dark:border-[#4E4238] bg-[#FBF8F1] dark:bg-[#27221E] text-[#2B2118] dark:text-[#EFE7DA] hover:bg-[#F6F0E4] dark:hover:bg-[#1E1915] active:translate-y-0.5 transition-all"
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4 text-[#2B2118]" />
              ) : (
                <Sun className="w-4 h-4 text-[#D98E04]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
