import React from 'react';
import Link from 'next/link';
import { Logo } from './logo';

const footerLinks = {
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],
  product: [
    { label: 'Browse Stories', href: '/stories' },
    { label: 'How it Works', href: '/#how-it-works' },
    { label: 'Pricing', href: '/#pricing' },
  ],
  support: [
    { label: 'FAQ', href: '/#faq' },
    { label: 'Track Order', href: '/track' },
    { label: 'Shipping Info', href: '/shipping' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-gradient-to-b from-background to-purple-50/50">
      <div className="container-custom py-12 sm:py-16">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1 mb-4 lg:mb-0">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Logo desktopHeightClass="h-12" mobileHeightClass="h-10" />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Personalized AI storybooks that make your child the hero of their
              own magical adventure. Ships across India.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-heading font-semibold mb-3">
              Company
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-heading font-semibold mb-3">
              Product
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-heading font-semibold mb-3">
              Support
            </h3>
            <ul className="space-y-2.5">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-heading font-semibold mb-3">Legal</h3>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Made with love in India
          </p>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Kutty Story. All
            rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
