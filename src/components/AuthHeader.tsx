'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function AuthHeader() {
  const router = useRouter();
  const supabase = createClient();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-white">
      <Link href="/" className="font-bold text-lg tracking-tight text-indigo-600">
        HuddleUp
      </Link>
      {signedIn && (
        <button
          onClick={handleSignOut}
          className="text-sm text-zinc-500 hover:text-zinc-800"
        >
          Sign out
        </button>
      )}
    </header>
  );
}
