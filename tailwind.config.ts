import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "./server/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        watsons: {
          dark: "#0B0C0B",
          card: "#151715",
          cream: "#F4EFE6",
          green: "#143A2F",
          gold: "#C89B42",
          goldHover: "#DFAD49",
          copper: "#A55F3F",
          mist: "#9FB7AD"
        }
      },
      fontFamily: {
        serif: ['"DM Serif Display"', "serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 42px rgba(200, 155, 66, 0.28)"
      }
    }
  },
  plugins: []
} satisfies Config;
