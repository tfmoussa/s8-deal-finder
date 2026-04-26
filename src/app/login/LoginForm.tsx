'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Home, Mail, CheckCircle } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const next = searchParams.get('next') ?? '/deal-explorer';

  // If already logged in, redirect immediately
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(next);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg">
            <Home className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">S8 Deal Finder</h1>
          <p className="text-slate-400 text-sm mt-1">Section 8 Investment Analyzer</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {sent ? (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-slate-800">Check your email</h2>
              <p className="text-sm text-slate-500 mt-2">
                We sent a magic link to <strong>{email}</strong>.
                Click it to sign in — no password needed.
              </p>
              <button
                className="mt-6 text-sm text-blue-600 hover:underline"
                onClick={() => setSent(false)}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-slate-800 mb-1">Sign in</h2>
              <p className="text-sm text-slate-500 mb-6">
                Enter your email to receive a magic link
              </p>
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoFocus
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-red-500">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? <Spinner size="sm" /> : null}
                  {loading ? 'Sending…' : 'Send magic link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
