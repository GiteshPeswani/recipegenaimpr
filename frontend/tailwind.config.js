/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F6F0E4",
        ink: "#2B2118",
        turmeric: "#D98E04",
        terracotta: "#B5502F",
        sage: "#7A8B69",
        cardbg: "#FBF8F1",
        // Slate kitchen notebook (dark mode)
        darkpaper: "#1E1915",
        darkcard: "#27221E",
        darkink: "#EFE7DA",
        darkborder: "#4E4238",
      },
      fontFamily: {
        serif: ["Fraunces", "serif"],
        sans: ["DM Sans", "sans-serif"],
        handwriting: ["Caveat", "cursive"],
      },
      boxShadow: {
        hard: "4px 4px 0px #2B2118",
        "hard-sm": "2px 2px 0px #2B2118",
        "hard-lg": "6px 6px 0px #2B2118",
        "hard-dark": "4px 4px 0px #0D0A08",
        "hard-dark-sm": "2px 2px 0px #0D0A08",
        "hard-dark-lg": "6px 6px 0px #0D0A08",
      },
      borderWidth: {
        "1.5": "1.5px",
      },
    },
  },
  plugins: [],
}
