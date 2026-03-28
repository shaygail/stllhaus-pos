import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "stll-cream": "#F7F5F2",
        "stll-charcoal": "#2F2F2F",
        "stll-muted": "#7A7A7A",
        "stll-accent": "#C6A27E",
        "stll-light": "#E8DED6",
        "stll-sage": "#A3B18A",
        // Legacy aliases used across pages — aligned with STLL Haus brand
        "cafe-brown": "#C6A27E",
        "cafe-dark": "#2F2F2F",
        "cafe-warm": "#7A7A7A",
        "cafe-accent": "#A3B18A",
        beige: {
          50: "#FAF9F6",
          100: "#F3F0EB",
          200: "#E8E4DE",
          300: "#D8D2C8",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 4px 12px rgba(47, 47, 47, 0.06)",
        md: "0 8px 20px rgba(47, 47, 47, 0.1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideLeft: {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideRight: {
          "0%": { opacity: "0", transform: "translateX(-24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 5px rgba(163, 177, 138, 0.5)" },
          "50%": { boxShadow: "0 0 20px rgba(163, 177, 138, 0.8)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 600ms ease-out both",
        slideUp: "slideUp 600ms ease-out both",
        slideDown: "slideDown 600ms ease-out both",
        slideLeft: "slideLeft 600ms ease-out both",
        slideRight: "slideRight 600ms ease-out both",
        scaleIn: "scaleIn 600ms ease-out both",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
        float: "float 3s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;