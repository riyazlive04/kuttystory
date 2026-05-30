'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Printer,
  BookOpen,
  Users,
  UserPlus,
  CpuIcon,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/leads', label: 'Leads', icon: UserPlus },
  { href: '/print-queue', label: 'Print Queue', icon: Printer },
  { href: '/stories', label: 'Stories', icon: BookOpen },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/ai-usage', label: 'AI Usage', icon: CpuIcon },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[hsl(var(--sidebar-bg))] text-[hsl(var(--sidebar-fg))]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
        <Image
          src="/KuttyStoryWordmark.png"
          alt="Kutty Story"
          width={143}
          height={31}
          className="h-7 w-auto object-contain"
        />
        <p className="text-xs text-white/50">Admin</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-4">
        <p className="text-xs text-white/40">Kutty Story Admin v1.0</p>
      </div>
    </aside>
  );
}
