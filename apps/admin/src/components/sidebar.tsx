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
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-white">
      {/* Logo — left edge aligns with the nav pills + footer (uniform 16px gutter) */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <Image
          src="/KuttyStoryWordmark.png"
          alt="Kutty Story"
          width={970}
          height={210}
          priority
          className="h-8 w-auto max-w-[150px] shrink object-contain object-left"
        />
        <span className="shrink-0 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-2 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wider text-white">
          Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm shadow-purple-500/20'
                  : 'text-foreground/70 hover:bg-purple-50 hover:text-purple-700'
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer — extra bottom padding so the version text never clips at the
          viewport edge / behind the OS taskbar. */}
      <div className="shrink-0 border-t border-border px-4 pb-8 pt-4">
        <p className="text-xs leading-normal text-muted-foreground">
          Kutty Story Admin v1.0
        </p>
      </div>
    </aside>
  );
}
