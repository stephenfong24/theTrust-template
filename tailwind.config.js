import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brandGold: "#D4AF37",
        ink: "#111111",
        textPrimary: "#1F2937",
        textSecondary: "#6B7280",
        line: "#E5E7EB",
        soft: "#F8F9FA"
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "Roboto", "Arial", "sans-serif"]
      },
      boxShadow: {
        soft: "0 8px 24px rgba(17, 17, 17, 0.06)"
      }
    }
  },
  plugins: [tailwindcssAnimate]
};
