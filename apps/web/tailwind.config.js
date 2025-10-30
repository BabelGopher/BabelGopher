/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-luckiest-guy)', 'sans-serif'],
        heading: ['var(--font-paytone-one)', 'sans-serif'],
        body: ['var(--font-nunito)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(-5%) rotate(0deg)' },
          '50%': { transform: 'translateY(5%) rotate(10deg)' },
        },
        floatReverse: {
          '0%, 100%': { transform: 'translateY(5%) rotate(0deg)' },
          '50%': { transform: 'translateY(-5%) rotate(-10deg)' },
        },
      },
      animation: {
        float: 'float 8s ease-in-out infinite',
        'float-fast': 'float 6s ease-in-out infinite',
        'float-slow': 'float 12s ease-in-out infinite',
        'float-reverse': 'floatReverse 10s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
