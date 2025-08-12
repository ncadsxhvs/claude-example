'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import Image from 'next/image';
import { useState } from 'react';

export default function AuthButton() {
  const { user, loading, signIn, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    
    try {
      await signIn();
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setError(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err.message || 'Failed to sign out. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="h-10 w-40 bg-gray-200 animate-pulse rounded-md"></div>
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          {user.photoURL && (
            <Image
              src={user.photoURL}
              alt="Profile"
              width={32}
              height={32}
              className="rounded-full border-2 border-gray-200"
            />
          )}
          <span className="text-gray-600">Welcome, {user.displayName}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium transition-all duration-300 hover:bg-blue-700 hover:-translate-y-px"
        >
          Sign Out
        </button>
        {error && (
          <div className="text-sm text-red-600 text-center max-w-xs">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleSignIn}
        disabled={isSigningIn}
        className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium transition-all duration-300 hover:bg-blue-700 hover:-translate-y-px disabled:bg-gray-400 disabled:transform-none disabled:cursor-not-allowed"
      >
        {isSigningIn ? 'Signing In...' : 'Sign In with Google'}
      </button>
      {error && (
        <div className="text-sm text-red-600 text-center max-w-xs">
          {error}
        </div>
      )}
    </div>
  );
}