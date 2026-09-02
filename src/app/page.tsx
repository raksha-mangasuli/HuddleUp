'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function redirect() {
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
      } else {
        router.replace('/onboarding');
      }
    }
    redirect();
  }, [router, supabase]);

  return (
    <main className="flex flex-1 items-center justify-center">
      <p className="text-zinc-400">Loading...</p>
    </main>
  );
}
