/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core Neutrals
        background: '#F9FAFB',
        surface: '#FFFFFF',
        primary: '#0F172A',
        secondary: '#64748B',
        border: '#E2E8F0',
        
        // Brand Accent - Electric Indigo
        accent: '#4F46E5',
        'accent-light': '#EEF2FF',
        'accent-dark': '#3730A3',
        
        // Secondary Accent
        amber: '#F59E0B',
        'amber-light': '#FFFBEB',
        
        // Semantic
        success: '#10B981',
        'success-light': '#ECFDF5',
        critical: '#EF4444',
        'critical-light': '#FEE2E2',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 4px 12px rgba(0, 0, 0, 0.08)',
        lg: '0 10px 25px rgba(0, 0, 0, 0.1)',
        focus: '0 0 0 3px rgba(79, 70, 229, 0.1)',
      },
      borderRadius: {
        none: '0px',
      }
    },
  },
  plugins: [],
}
