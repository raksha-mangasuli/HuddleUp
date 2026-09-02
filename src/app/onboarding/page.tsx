'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkGroup() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace('/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('group_id')
        .eq('id', sessionData.session.user.id)
        .single();
      if (profile?.group_id) {
        router.replace('/dashboard');
      }
    }
    checkGroup();
  }, [router, supabase]);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col gap-4 bg-white p-8 rounded-xl border border-zinc-200 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">Get moving with friends</h1>
        <p className="text-zinc-500">Create a new group or join one with an invite code.</p>
        <Link
          href="/group/new"
          className="bg-indigo-600 text-white rounded-lg py-2 font-medium hover:bg-indigo-700"
        >
          Create a group
        </Link>
        <Link
          href="/group/join"
          className="border border-zinc-300 rounded-lg py-2 font-medium hover:bg-zinc-50"
        >
          Join a group
        </Link>
      </div>
    </main>
  );
}
