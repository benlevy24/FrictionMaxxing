// Single source of truth for all persisted data.
// All async functions are safe to call concurrently — each reads fresh state.

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Master app list ───────────────────────────────────────────────────────────

export const ALL_APPS = [
  { id: 'instagram', label: 'Instagram',   emoji: '📸' },
  { id: 'tiktok',    label: 'TikTok',      emoji: '🎵' },
  { id: 'youtube',   label: 'YouTube',     emoji: '▶️' },
  { id: 'x',         label: 'X / Twitter', emoji: '🐦' },
  { id: 'facebook',  label: 'Facebook',    emoji: '👍' },
  { id: 'snapchat',  label: 'Snapchat',    emoji: '👻' },
  { id: 'reddit',    label: 'Reddit',      emoji: '🤖' },
  { id: 'threads',   label: 'Threads',     emoji: '🧵' },
  { id: 'linkedin',  label: 'LinkedIn',    emoji: '💼' },
  { id: 'pinterest', label: 'Pinterest',   emoji: '📌' },
];

export const DEFAULT_BLOCKED_APPS = [
  'instagram', 'tiktok', 'youtube', 'x', 'facebook', 'snapchat', 'reddit',
];

export const DEFAULT_ENABLED_GAMES = [
  'tictactoe', 'maze', 'hangman', 'math', 'stroop', 'pong',
];

// ── Storage keys ──────────────────────────────────────────────────────────────

const K = {
  SETTINGS: 'fm_settings',
  EVENTS:   'fm_events',
};

// ── Date helpers ──────────────────────────────────────────────────────────────

function toStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getToday() {
  return toStr(new Date());
}

function shiftDay(dateStr, n) {
  const d = toDate(dateStr);
  d.setDate(d.getDate() + n);
  return toStr(d);
}

export function dayLabel(dateStr) {
  return toDate(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
}

// ── Settings ──────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  blockedApps:      DEFAULT_BLOCKED_APPS,
  enabledGames:     DEFAULT_ENABLED_GAMES,
  installDate:      null,   // set on first write
  onboardingDone:   false,
};

export async function getSettings() {
  try {
    const raw = await AsyncStorage.getItem(K.SETTINGS);
    const saved = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(partial) {
  try {
    const current = await getSettings();
    const next = { ...current, ...partial };
    // Stamp install date on first real save
    if (!next.installDate) next.installDate = getToday();
    await AsyncStorage.setItem(K.SETTINGS, JSON.stringify(next));
  } catch { /* storage write failure — silently ignore */ }
}

// ── Events ────────────────────────────────────────────────────────────────────
// Event shape:
// {
//   id:             string   — unique id
//   date:           string   — 'YYYY-MM-DD' local date
//   timestamp:      number   — Date.now()
//   appId:          string
//   appLabel:       string
//   appEmoji:       string
//   gameCompleted:  boolean  — user beat the game
//   walkedAway:     boolean  — user chose not to open the app
// }

export async function getEvents() {
  try {
    const raw = await AsyncStorage.getItem(K.EVENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function recordEvent({ appId, appLabel, appEmoji, gameCompleted, walkedAway }) {
  try {
    const events = await getEvents();
    const event = {
      id:            `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      date:          getToday(),
      timestamp:     Date.now(),
      appId,
      appLabel,
      appEmoji:      appEmoji ?? '',
      gameCompleted: !!gameCompleted,
      walkedAway:    !!walkedAway,
    };
    events.push(event);
    await AsyncStorage.setItem(K.EVENTS, JSON.stringify(events));
    return event;
  } catch {
    return null;
  }
}

export async function clearAllData() {
  await AsyncStorage.multiRemove([K.SETTINGS, K.EVENTS]);
}

// ── Derived stats (pure, synchronous — pass events as input) ──────────────────

export function computeStreak(events) {
  const today = getToday();
  const datesWithEvents = new Set(events.map((e) => e.date));

  // Determine the most recent active date to count backward from
  let anchor = null;
  if (datesWithEvents.has(today)) {
    anchor = today;
  } else {
    const yesterday = shiftDay(today, -1);
    if (datesWithEvents.has(yesterday)) anchor = yesterday;
  }

  let current = 0;
  if (anchor) {
    let d = anchor;
    while (datesWithEvents.has(d)) {
      current++;
      d = shiftDay(d, -1);
    }
  }

  // Best streak (all-time)
  const sorted = [...datesWithEvents].sort();
  let best = 0, run = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] === shiftDay(sorted[i - 1], 1)) {
      run++;
    } else {
      run = 1;
    }
    if (run > best) best = run;
  }

  return { current, best: Math.max(current, best) };
}

export function deriveTodayStats(events) {
  const today = getToday();
  const todayEvents = events.filter((e) => e.date === today);
  return {
    intercepted: todayEvents.length,
    completed:   todayEvents.filter((e) => e.gameCompleted).length,
    walkedAway:  todayEvents.filter((e) => e.walkedAway).length,
    skipped:     todayEvents.filter((e) => !e.walkedAway).length,
  };
}

export function deriveWeeklyStats(events) {
  const today = getToday();
  return Array.from({ length: 7 }, (_, i) => {
    const date      = shiftDay(today, i - 6); // 6 days ago → today
    const dayEvents = events.filter((e) => e.date === date);
    return {
      day:         dayLabel(date),
      date,
      intercepted: dayEvents.length,
      completed:   dayEvents.filter((e) => e.gameCompleted).length,
    };
  });
}

export function deriveByAppStats(events, blockedAppIds) {
  return ALL_APPS.filter((a) => blockedAppIds.includes(a.id))
    .map((app) => {
      const appEvents = events.filter((e) => e.appId === app.id);
      return {
        ...app,
        intercepted: appEvents.length,
        completed:   appEvents.filter((e) => e.gameCompleted).length,
      };
    })
    .filter((a) => a.intercepted > 0)
    .sort((a, b) => b.intercepted - a.intercepted);
}

export function deriveAllTimeStats(events, streak, installDate) {
  const today   = getToday();
  const install = installDate ?? today;
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSinceInstall = Math.max(
    1,
    Math.round((toDate(today) - toDate(install)) / msPerDay) + 1
  );
  return {
    intercepted:      events.length,
    completed:        events.filter((e) => e.gameCompleted).length,
    walkedAway:       events.filter((e) => e.walkedAway).length,
    skipped:          events.filter((e) => !e.walkedAway).length,
    streakCurrent:    streak.current,
    streakBest:       streak.best,
    daysSinceInstall,
  };
}
