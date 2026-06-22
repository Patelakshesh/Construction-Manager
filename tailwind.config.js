/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        construction: {
          yellow: "#FDB71A",
          dark: "#2B2D33",
          grey: "#4A4D57",
          light: "#F5F5F5",
        },
      },
      boxShadow: {
        card: "0 4px 16px rgba(17, 24, 39, 0.08)",
      },
    },
  },
  plugins: [],
};
