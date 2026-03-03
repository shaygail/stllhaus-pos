import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        beige: {
          50: "#FDFAF5",
          100: "#F5F0E8",
          200: "#EDE4D3",
          300: "#DED0B6",
        },
        cafe: {
          brown: "#5C3D2E",
          dark:  "#2C1810",
          warm:  "#8B6355",
          accent:"#C8956C",
          light: "#F0E6D3",
        },
      },
    },
  },
  plugins: [],
};

export default config;