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
        <NavLink key={item.href} href={item.href} label={item.label} />
      ))}
      
      {user && (
        <NavLink href="/chat" label="Chat with Dong" />
      )}
    </nav>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group relative text-xl font-normal text-gray-800 transition-colors duration-300 hover:text-black"
    >
      <span className="relative z-10">{label}</span>
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
    </Link>
  );
}