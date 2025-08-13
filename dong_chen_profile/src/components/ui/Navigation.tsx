'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';

const navItems = [
  { href: '/about', label: 'About Dong' },
  { href: '/experience', label: 'Experience' },
  { href: '/contact', label: 'Connect' },
];

export default function Navigation() {
  const { user } = useAuth();

  return (
    <nav className="flex flex-col gap-6 items-center">
      {navItems.map((item) => (
        <NavLink key={item.href} href={item.href} label={item.label} external={item.external} />
      ))}
      
      {user && (
        <NavLink href="/chat" label="Chat with Dong" />
      )}
    </nav>
  );
}

function NavLink({ href, label, external }: { href: string; label: string; external?: boolean }) {
  const linkContent = (
    <>
      <span className="relative z-10 flex items-center gap-1">
        {label}
        {external && <span className="text-blue-600">🔗</span>}
      </span>
      <span 
        className="absolute bottom-0 left-0 w-full h-px bg-gray-800 transform scale-x-100 origin-left transition-transform duration-300 group-hover:scale-x-0 group-hover:origin-right"
      />
      <span 
        className="absolute bottom-0 left-0 w-full h-px bg-gray-600 transform scale-x-0 origin-right transition-all duration-300 group-hover:scale-x-100 group-hover:origin-left animate-pulse"
        style={{
          animationDuration: '0.6s',
          animationTimingFunction: 'ease-in-out',
        }}
      />
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative text-xl font-normal text-gray-800 transition-colors duration-300 hover:text-black"
      >
        {linkContent}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className="group relative text-xl font-normal text-gray-800 transition-colors duration-300 hover:text-black"
    >
      {linkContent}
    </Link>
  );
}