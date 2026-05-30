'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogOut } from 'lucide-react';
import { Button } from '@kutty-story/ui';
import { useAuth } from '@/lib/auth-context';
import { AuthModal } from './auth-modal';
import { Logo } from './logo';

const navLinks = [
  { href: '/stories', label: 'Stories' },
  { href: '/#how-it-works', label: 'How it Works' },
  { href: '/#pricing', label: 'Pricing' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authModal, setAuthModal] = useState<'login' | 'signup' | null>(null);
  const { user, logout } = useAuth();

  // Auth is temporarily hidden — flip to true to re-enable Log In / Sign Up.
  const AUTH_ENABLED = false;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="container-custom flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <Logo desktopHeightClass="h-11" mobileHeightClass="h-8" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/create"
                  className="inline-flex items-center justify-center rounded-full bg-gradient-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  Create Your Book
                </Link>
                <div className="relative group">
                  <button className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <User className="h-4 w-4" />
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border bg-background p-2 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <p className="px-3 py-2 text-sm font-medium truncate">
                      {user.name}
                    </p>
                    <hr className="my-1 border-border" />
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : AUTH_ENABLED ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setAuthModal('login')}
                  className="text-sm"
                >
                  Log In
                </Button>
                <button
                  onClick={() => setAuthModal('signup')}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  Sign Up
                </button>
              </>
            ) : (
              <Link
                href="/create"
                className="inline-flex items-center justify-center rounded-full bg-gradient-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Create Your Book
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg hover:bg-accent transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-border/40"
            >
              <div className="container-custom py-4 space-y-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <hr className="border-border" />
                {user ? (
                  <>
                    <p className="py-2 text-sm font-medium">{user.name}</p>
                    <Link
                      href="/create"
                      onClick={() => setMobileOpen(false)}
                      className="block w-full text-center rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white"
                    >
                      Create Your Book
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setMobileOpen(false);
                      }}
                      className="flex items-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </>
                ) : AUTH_ENABLED ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setAuthModal('login');
                        setMobileOpen(false);
                      }}
                      className="w-full rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-accent transition-colors"
                    >
                      Log In
                    </button>
                    <button
                      onClick={() => {
                        setAuthModal('signup');
                        setMobileOpen(false);
                      }}
                      className="w-full rounded-full bg-gradient-brand py-2.5 text-sm font-semibold text-white"
                    >
                      Sign Up
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/create"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full text-center rounded-full bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Create Your Book
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AuthModal
        mode={authModal}
        onClose={() => setAuthModal(null)}
        onSwitchMode={(mode) => setAuthModal(mode)}
      />
    </>
  );
}
