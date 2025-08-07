'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import Image from 'next/image';

export default function AuthButton() {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) {
    return (
      <div className="h-10 w-40 bg-gray-200 animate-pulse rounded-md"></div>
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
          onClick={signOut}
          className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium transition-all duration-300 hover:bg-blue-700 hover:-translate-y-px"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={signIn}
      className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium transition-all duration-300 hover:bg-blue-700 hover:-translate-y-px"
    >
      Sign In with Google
    </button>
  );
}