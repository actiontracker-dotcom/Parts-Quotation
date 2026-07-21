/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
    "./src/hooks/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#12172B",
          50: "#F4F5F9",
          100: "#E4E6EF",
          200: "#C7CBDE",
          300: "#9BA1C1",
          400: "#6971A0",
          500: "#454C7C",
          600: "#2E3460",
          700: "#1F2445",
          800: "#171B34",
          900: "#12172B",
          950: "#0A0D1B",
        },
        surface: {
          DEFAULT: "#F4F6FB",
          card: "#FFFFFF",
          sunken: "#EBEEF6",
        },
        accent: {
          DEFAULT: "#3457D5",
          50: "#EEF1FD",
          100: "#DCE3FB",
          200: "#B4C1F5",
          300: "#8B9FEF",
          400: "#5F79E5",
          500: "#3457D5",
          600: "#2843AD",
          700: "#1F3487",
          800: "#182762",
          900: "#121C48",
        },
        teal: {
          DEFAULT: "#1F9D7C",
          50: "#E9F8F3",
          100: "#CBEFE2",
          500: "#1F9D7C",
          600: "#187E64",
          700: "#125F4B",
        },
        amber: {
          DEFAULT: "#E2A33D",
          50: "#FCF3E3",
          100: "#F8E3BE",
          500: "#E2A33D",
          600: "#B87F27",
        },
        danger: {
          DEFAULT: "#D8465F",
          50: "#FCEBEE",
          100: "#F7CDD5",
          500: "#D8465F",
          600: "#B22F47",
        },
      },
      fontFamily: {
        display: ["var(--font-sora)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(18, 23, 43, 0.04), 0 8px 24px -12px rgba(18, 23, 43, 0.12)",
        "card-hover": "0 4px 10px rgba(18, 23, 43, 0.06), 0 16px 36px -14px rgba(18, 23, 43, 0.18)",
        rail: "-12px 0 32px -20px rgba(18, 23, 43, 0.15)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "fade-slide-in": {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-slide-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-6px)" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-once": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.04)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "fade-slide-in": "fade-slide-in 0.22s ease-out",
        "fade-slide-out": "fade-slide-out 0.18s ease-in forwards",
        "toast-in": "toast-in 0.25s ease-out",
        "pulse-once": "pulse-once 0.4s ease-out",
      },
    },
  },
  plugins: [],
};
