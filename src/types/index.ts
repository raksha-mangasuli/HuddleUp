export type SportType = 'running' | 'cycling' | 'badminton' | 'table_tennis' | 'other';

export const SPORT_TYPES: { value: SportType; label: string }[] = [
  { value: 'running', label: 'Running' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'badminton', label: 'Badminton' },
  { value: 'table_tennis', label: 'Table Tennis' },
  { value: 'other', label: 'Other' },
];

export interface Profile {
  id: string;
  display_name: string;
  group_id: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  weekly_goal_minutes: number;
  created_by: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  group_id: string | null;
  sport_type: SportType;
  duration_minutes: number;
  distance_km: number | null;
  activity_date: string;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  total_minutes: number;
}
