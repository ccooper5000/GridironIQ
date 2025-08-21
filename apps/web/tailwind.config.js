/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  // Ensure dynamic classes used via maps/template strings are kept
  safelist: [
    // Unit color sets
    { pattern: /^(bg|border|text)-(green|indigo|amber)-(500|600)$/ },

    // A few utility one-offs we used
    'w-[3px]',
    'md:w-[2px]',
    'min-w-[32px]',
    'min-w-[40px]',
  ],
  darkMode: 'media', // keeps prefers-color-scheme happy for Lighthouse
};