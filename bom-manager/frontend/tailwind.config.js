/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // High fidelity enterprise engineering palette
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
        status: {
          active: '#10b981',      // Green
          nrnd: '#f59e0b',        // Yellow/Amber
          obsolete: '#ef4444',    // Red
          deprecated: '#f97316',  // Orange
          unknown: '#6b7280',     // Grey/Neutral
        }
      }
    },
  },
  plugins: [],
}
