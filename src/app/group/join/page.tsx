'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function JoinGroupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setError('You need to be logged in.');
      setLoading(false);
      return;
    }

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id')
      .eq('invite_code', code.trim().toUpperCase())
      .single();

    if (groupError || !group) {
      setError('No group found with that invite code.');
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ group_id: group.id })
      .eq('id', userId);

    setLoading(false);
    if (profileError) {
      setError(profileError.message);
      return;
    }
    router.replace('/dashboard');
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col gap-4 bg-white p-8 rounded-xl border border-zinc-200"
      >
        <h1 className="text-2xl font-bold text-zinc-900">Join a group</h1>
        <input
          type="text"
          placeholder="Invite code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="border border-zinc-300 rounded-lg px-3 py-2 uppercase tracking-widest"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white rounded-lg py-2 font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Joining...' : 'Join group'}
        </button>
      </form>
    </main>
  );
}
