import LoginForm from '../components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-100/20 rounded-full blur-3xl"></div>
      </div>

      {/* Login Card Container */}
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10">
          <LoginForm />
        </div>

        {/* Security Footer */}
        <div className="mt-6 flex items-center justify-center gap-6 px-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            SECURE ACCESS
          </div>
          <div className="h-4 w-px bg-gray-300"></div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            256-BIT ENCRYPTED
          </div>
        </div>

        {/* Links Footer */}
        <div className="mt-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <a href="/" className="hover:text-gray-700 transition">PRIVACY POLICY</a>
            <span>•</span>
            <a href="/" className="hover:text-gray-700 transition">TERMS OF SERVICE</a>
            <span>•</span>
            <a href="/" className="hover:text-gray-700 transition">SYSTEM STATUS</a>
          </div>
          <p className="text-xs text-gray-400">
            © 2024 CLINICAL AZURE PHARMACY MANAGEMENT. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </div>
  )
}
