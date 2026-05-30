'use client';

import React from 'react';
import Image from 'next/image';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/sidebar';
import { LogOut, User } from 'lucide-react';

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--muted))]">
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-end gap-4 border-b bg-white/80 px-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100">
              <User className="h-4 w-4 text-brand-600" />
            </div>
            <div className="text-sm">
              <p className="font-medium">{user?.name || user?.email}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="ml-2 rounded-lg p-2 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-xl border bg-white p-8 shadow-lg">
      <div className="mb-6 text-center">
        <Image
          src="/KuttyStoryFullLogo.png"
          alt="Kutty Story"
          width={240}
          height={88}
          priority
          className="mx-auto mb-4 h-14 w-auto object-contain"
        />
        <h1 className="text-xl font-bold">Admin Login</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Kutty Story Admin Panel</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            placeholder="admin@kuttystory.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminLayout>{children}</AdminLayout>
    </AuthProvider>
  );
}
