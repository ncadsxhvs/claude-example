'use client';

import Navigation from './Navigation';
import AuthButton from '../auth/AuthButton';

interface LayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
}

export default function Layout({ children, showNavigation = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <div 
        className="min-h-screen"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.02) 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
      >
        <div className="max-w-2xl mx-auto px-10 py-20 min-h-screen flex flex-col justify-center">
          {showNavigation && (
            <>
              <header className="mb-16 text-center">
                <h1 className="text-6xl font-light tracking-tight mb-3 text-gray-900">
                  Riley Brown
                </h1>
                <p className="text-lg text-gray-600 font-normal">
                  AI Educator & Content Creator
                </p>
              </header>
              
              <div className="mb-12 text-center">
                <AuthButton />
              </div>
            </>
          )}
          
          <main className="flex-1">
            {children}
          </main>
          
          {showNavigation && <Navigation />}
        </div>
      </div>
    </div>
  );
}