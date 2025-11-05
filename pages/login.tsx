import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import AuthWrapper from '../components/AuthWrapper';
import AuthLayout from '../components/AuthLayout';
import GoogleSignInButton from '../components/GoogleSignInButton';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      // Clear saved organization to force selection screen for multi-org users
      localStorage.removeItem('selectedOrganizationId');
      // Redirect to select-organization which will handle routing
      router.push('/select-organization');
    }
    setLoading(false);
  };

  const handleGoogleError = (error: string) => {
    setErrorMsg(error);
  };

  return (
    <AuthWrapper requireAuth={false}>
      <AuthLayout title="Log in" subtitle={
        <>
          Don't have an account?{' '}
          <Link href="/signup" className="text-gray-300 hover:text-white underline">
            Create an account
          </Link>
        </>
      }>
        <div className="space-y-6">
          {/* Google SSO Button */}
          <GoogleSignInButton onError={handleGoogleError} />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#121212] text-gray-400">or</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                id="email"
                type="email"
                placeholder="Enter your email address"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-xl">
                <p className="text-red-400 text-sm">{errorMsg}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full bg-white text-black hover:bg-gray-100 rounded-xl py-3 font-medium"
              loading={loading}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Continue'}
            </Button>
          </form>

          {/* Terms & Privacy */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              By continuing, you agree to our{' '}
              <Link href="/terms" className="text-gray-400 hover:text-white underline">
                Terms & Conditions
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-gray-400 hover:text-white underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </AuthLayout>
    </AuthWrapper>
  );
}
