'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, signupSchema } from '@kutty-story/shared';
import type { LoginInput, SignupInput } from '@kutty-story/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Button,
} from '@kutty-story/ui';
import { useAuth } from '@/lib/auth-context';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  mode: 'login' | 'signup' | null;
  onClose: () => void;
  onSwitchMode: (mode: 'login' | 'signup') => void;
}

export function AuthModal({ mode, onClose, onSwitchMode }: AuthModalProps) {
  const { login, signup, loginWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const handleLogin = async (data: LoginInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      onClose();
      loginForm.reset();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Login failed. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (data: SignupInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signup(data.name, data.email, data.password);
      onClose();
      signupForm.reset();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Sign up failed. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitchMode = (newMode: 'login' | 'signup') => {
    setError(null);
    loginForm.reset();
    signupForm.reset();
    onSwitchMode(newMode);
  };

  return (
    <Dialog open={mode !== null} onOpenChange={() => onClose()}>
      <DialogContent
        onClose={onClose}
        className="max-w-md w-full"
      >
        <DialogHeader>
          <DialogTitle className="text-center font-heading text-2xl">
            {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {mode === 'login'
              ? 'Sign in to continue creating magical stories'
              : 'Join thousands of parents creating personalized storybooks'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          {/* Google OAuth */}
          <button
            onClick={loginWithGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-lg border-2 border-border py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Login Form */}
          {mode === 'login' && (
            <form
              onSubmit={loginForm.handleSubmit(handleLogin)}
              className="space-y-4"
            >
              <div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...loginForm.register('email')}
                    type="email"
                    placeholder="Email address"
                    className="pl-10"
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="mt-1 text-xs text-destructive">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...loginForm.register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <p className="mt-1 text-xs text-destructive">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-gradient-brand hover:opacity-90 text-white"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          )}

          {/* Signup Form */}
          {mode === 'signup' && (
            <form
              onSubmit={signupForm.handleSubmit(handleSignup)}
              className="space-y-4"
            >
              <div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...signupForm.register('name')}
                    type="text"
                    placeholder="Full name"
                    className="pl-10"
                  />
                </div>
                {signupForm.formState.errors.name && (
                  <p className="mt-1 text-xs text-destructive">
                    {signupForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...signupForm.register('email')}
                    type="email"
                    placeholder="Email address"
                    className="pl-10"
                  />
                </div>
                {signupForm.formState.errors.email && (
                  <p className="mt-1 text-xs text-destructive">
                    {signupForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...signupForm.register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password (min 8 characters)"
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {signupForm.formState.errors.password && (
                  <p className="mt-1 text-xs text-destructive">
                    {signupForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-gradient-brand hover:opacity-90 text-white"
              >
                {isSubmitting ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          )}

          {/* Toggle mode */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => handleSwitchMode('signup')}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => handleSwitchMode('login')}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
