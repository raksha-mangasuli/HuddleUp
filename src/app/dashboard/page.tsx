'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { startOfWeekISO } from '@/lib/week';
import { SPORT_TYPES, SportType, Group, LeaderboardEntry } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sportType, setSportType] = useState<SportType>('running');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [activityDate, setActivityDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setError(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      router.replace('/login');
      return;
    }
    setUserId(session.user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('group_id')
      .eq('id', session.user.id)
      .single();

    if (!profile?.group_id) {
      router.replace('/onboarding');
      return;
    }

    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', profile.group_id)
      .single();

    if (groupError || !groupData) {
      setError('Could not load group.');
      setLoading(false);
      return;
    }
    setGroup(groupData);

    const { data: members } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('group_id', groupData.id);

    const weekStart = startOfWeekISO();
    const { data: logs } = await supabase
      .from('activity_logs')
      .select('user_id, duration_minutes')
      .eq('group_id', groupData.id)
      .gte('activity_date', weekStart);

    const minutesByUser = new Map<string, number>();
    for (const log of logs ?? []) {
      minutesByUser.set(log.user_id, (minutesByUser.get(log.user_id) ?? 0) + log.duration_minutes);
    }

    const board: LeaderboardEntry[] = (members ?? [])
      .map((m) => ({
        user_id: m.id,
        display_name: m.display_name,
        total_minutes: minutesByUser.get(m.id) ?? 0,
      }))
      .sort((a, b) => b.total_minutes - a.total_minutes);

    setLeaderboard(board);
    setTotalMinutes(board.reduce((sum, entry) => sum + entry.total_minutes, 0));
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    loadData();
  }, [loadData]);

  async function handleLogActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !group) return;
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from('activity_logs').insert({
      user_id: userId,
      group_id: group.id,
      sport_type: sportType,
      duration_minutes: Number(duration),
      distance_km: distance ? Number(distance) : null,
      activity_date: activityDate,
    });

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setDuration('');
    setDistance('');
    await loadData();
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </main>
    );
  }

  if (!group) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-red-600">{error ?? 'Something went wrong.'}</p>
      </main>
    );
  }

  const progressPct = Math.min(100, Math.round((totalMinutes / group.weekly_goal_minutes) * 100));

  return (
    <main className="flex-1 max-w-2xl w-full mx-auto p-6 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{group.name}</h1>
        <p className="text-sm text-zinc-500">
          Invite code: <span className="font-mono font-semibold">{group.invite_code}</span>
        </p>
      </div>

      <section className="bg-white p-6 rounded-xl border border-zinc-200">
        <div className="flex justify-between items-baseline mb-2">
          <h2 className="font-semibold text-zinc-900">This week&apos;s goal</h2>
          <span className="text-sm text-zinc-500">
            {totalMinutes} / {group.weekly_goal_minutes} min
          </span>
        </div>
        <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </section>

      <section className="bg-white p-6 rounded-xl border border-zinc-200">
        <h2 className="font-semibold text-zinc-900 mb-4">Leaderboard</h2>
        <ol className="flex flex-col gap-2">
          {leaderboard.map((entry, i) => (
            <li key={entry.user_id} className="flex justify-between text-sm">
              <span>
                {i + 1}. {entry.display_name}
                {entry.user_id === userId && ' (you)'}
              </span>
              <span className="text-zinc-500">{entry.total_minutes} min</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-white p-6 rounded-xl border border-zinc-200">
        <h2 className="font-semibold text-zinc-900 mb-4">Log an activity</h2>
        <form onSubmit={handleLogActivity} className="flex flex-col gap-3">
          <select
            value={sportType}
            onChange={(e) => setSportType(e.target.value as SportType)}
            className="border border-zinc-300 rounded-lg px-3 py-2"
          >
            {SPORT_TYPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <div className="flex gap-3">
            <input
              type="number"
              placeholder="Duration (min)"
              required
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="border border-zinc-300 rounded-lg px-3 py-2 flex-1"
            />
            <input
              type="number"
              placeholder="Distance (km, optional)"
              min={0}
              step="0.1"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="border border-zinc-300 rounded-lg px-3 py-2 flex-1"
            />
          </div>
          <input
            type="date"
            required
            value={activityDate}
            onChange={(e) => setActivityDate(e.target.value)}
            className="border border-zinc-300 rounded-lg px-3 py-2"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 text-white rounded-lg py-2 font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Logging...' : 'Log activity'}
          </button>
        </form>
      </section>
    </main>
  );
}
