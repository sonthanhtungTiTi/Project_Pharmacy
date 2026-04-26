/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
            // Colors based on the Clinical Azure mockup
            primary: '#0d6efd',
            'primary-dark': '#0b5ed7',
            secondary: '#6c757d',
            success: '#198754',
            'success-light': '#d1e7dd',
            danger: '#dc3545',
            'danger-light': '#f8d7da',
            warning: '#ffc107',
            'warning-light': '#fff3cd',
            info: '#0dcaf0',
            light: '#f8f9fa',
            dark: '#1e293b', // Updated dark color for the "Prescription Accuracy" card
            'dark-text': '#212529',
            'gray-100': '#f8f9fa',
            'gray-200': '#e9ecef',
            'gray-300': '#dee2e6',
            'gray-400': '#ced4da',
            'gray-500': '#adb5bd',
            'gray-600': '#6c757d',
            'gray-700': '#495057',
            'gray-800': '#343a40',
            'gray-900': '#212529',
            'sidebar-hover': '#f1f5f9',
            'main-bg': '#f8f9fc',
            'card-border': '#e2e8f0',
        },
        fontFamily: {
            sans: ['Inter', 'system-ui', 'sans-serif'],
        },
        boxShadow: {
            'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }
      },
    },
    plugins: [],
  }
  
