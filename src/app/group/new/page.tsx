'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function NewGroupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState('');
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
      .insert({ name, invite_code: generateInviteCode(), created_by: userId })
      .select()
      .single();

    if (groupError || !group) {
      setError(groupError?.message ?? 'Could not create group.');
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
        <h1 className="text-2xl font-bold text-zinc-900">Create a group</h1>
        <input
          type="text"
          placeholder="Group name (e.g. Weekend Warriors)"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-zinc-300 rounded-lg px-3 py-2"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white rounded-lg py-2 font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create group'}
        </button>
      </form>
    </main>
  );
}
