import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-josefin-sans)", ...defaultTheme.fontFamily.sans],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [
    ({ addBase, theme }: { addBase: Function; theme: Function }) => {
      addBase({
        html: { fontSize: "16px" },
        body: {
          fontFamily: theme("fontFamily.sans"),
          lineHeight: "1.5",
          color: theme("colors.gray.900"),
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
        h1: {
          fontSize: theme("fontSize.4xl"),
          fontWeight: theme("fontWeight.bold"),
          letterSpacing: theme("letterSpacing.tight"),
          marginBottom: theme("spacing.4"),
        },
        h2: {
          fontSize: theme("fontSize.3xl"),
          fontWeight: theme("fontWeight.semibold"),
          marginBottom: theme("spacing.3"),
        },
        h3: {
          fontSize: theme("fontSize.2xl"),
          fontWeight: theme("fontWeight.semibold"),
          marginBottom: theme("spacing.2"),
        },
        h4: {
          fontSize: theme("fontSize.xl"),
          fontWeight: theme("fontWeight.semibold"),
          marginBottom: theme("spacing.2"),
        },
        p: { marginBottom: theme("spacing.4") },
        a: { color: theme("colors.blue.600") },
        button: {
          fontWeight: theme("fontWeight.semibold"),
          borderRadius: theme("borderRadius.full"),
        },
      });
    },
  ],
};

export default config;
