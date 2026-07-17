import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "./server/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        watsons: {
          dark: "rgb(var(--watsons-dark) / <alpha-value>)",
          card: "rgb(var(--watsons-card) / <alpha-value>)",
          cream: "rgb(var(--watsons-cream) / <alpha-value>)",
          green: "rgb(var(--watsons-green) / <alpha-value>)",
          gold: "rgb(var(--watsons-gold) / <alpha-value>)",
          goldHover: "rgb(var(--watsons-gold-hover) / <alpha-value>)",
          copper: "rgb(var(--watsons-copper) / <alpha-value>)",
          mist: "rgb(var(--watsons-mist) / <alpha-value>)"
        }
      },
      fontFamily: {
        serif: ["var(--watsons-font-serif)", "serif"],
        sans: ["var(--watsons-font-sans)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 42px rgba(200, 155, 66, 0.28)"
      }
    }
  },
  plugins: []
} satisfies Config;
