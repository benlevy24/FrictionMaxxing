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
  { id: 'chatgpt',   label: 'ChatGPT',     emoji: '🧠' },
  { id: 'threads',   label: 'Threads',     emoji: '🧵' },
  { id: 'linkedin',  label: 'LinkedIn',    emoji: '💼' },
  { id: 'pinterest', label: 'Pinterest',   emoji: '📌' },
];

export const DEFAULT_BLOCKED_APPS = [
  'instagram', 'tiktok', 'youtube', 'x', 'facebook', 'snapchat', 'reddit', 'chatgpt',
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
  freeZones:        [],     // [{ id, name, lat, lng, radiusMeters }]
  difficulty:       'medium', // 'easy' | 'medium' | 'hard'
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
  // Streak rules:
  //   Win day  — had at least one interception AND walked away every time (no "open anyway")
  //   Loss day — opened the app anyway at least once (walkedAway=false)
  //   Inactive — no events at all → streak freezes (neither adds nor resets)
  //
  // Current streak: walk backward from today counting win days,
  //   skipping inactive gaps, stopping the moment a loss day is hit.
  // Best streak: longest consecutive run of win days (inactive gaps between wins are fine).

  if (events.length === 0) return { current: 0, best: 0 };

  // Build date → 'win' | 'loss' (loss overwrites win if any event on that day opened the app)
  const dateMap = {};
  for (const e of events) {
    if (!dateMap[e.date]) dateMap[e.date] = 'win';
    if (!e.walkedAway)    dateMap[e.date] = 'loss';
  }

  // Current streak — walk backward from today, skip inactive, stop at loss
  let current = 0;
  let d = getToday();
  for (let i = 0; i < 365; i++) {
    const s = dateMap[d];
    if (s === 'win')  { current++; }
    else if (s === 'loss') { break; }
    // undefined (inactive) → skip
    d = shiftDay(d, -1);
  }

  // Best streak — longest run of wins with no loss between them
  const activeDates = Object.keys(dateMap).sort();
  let best = 0, run = 0;
  for (const date of activeDates) {
    if      (dateMap[date] === 'win')  { run++; if (run > best) best = run; }
    else if (dateMap[date] === 'loss') { run = 0; }
  }

  return { current, best: Math.max(current, best) };
}

export function deriveTodayStats(events) {
  const today = getToday();
  const todayEvents = events.filter((e) => e.date === today);
  return {
    intercepted:  todayEvents.length,
    walkedAway:   todayEvents.filter((e) =>  e.gameCompleted &&  e.walkedAway).length,
    openedAnyway: todayEvents.filter((e) =>  e.gameCompleted && !e.walkedAway).length,
    rageQuit:     todayEvents.filter((e) => !e.gameCompleted).length,
  };
}

export function deriveWeeklyStats(events) {
  const today = getToday();
  return Array.from({ length: 7 }, (_, i) => {
    const date      = shiftDay(today, i - 6); // 6 days ago → today
    const dayEvents = events.filter((e) => e.date === date);
    return {
      day:          dayLabel(date),
      date,
      intercepted:  dayEvents.length,
      walkedAway:   dayEvents.filter((e) =>  e.gameCompleted &&  e.walkedAway).length,
      rageQuit:     dayEvents.filter((e) => !e.gameCompleted).length,
      openedAnyway: dayEvents.filter((e) =>  e.gameCompleted && !e.walkedAway).length,
      succeeded:    dayEvents.filter((e) => !(e.gameCompleted && !e.walkedAway)).length,
    };
  });
}

export function deriveByAppStats(events, blockedAppIds) {
  return ALL_APPS.filter((a) => blockedAppIds.includes(a.id))
    .map((app) => {
      const appEvents = events.filter((e) => e.appId === app.id);
      return {
        ...app,
        intercepted:  appEvents.length,
        walkedAway:   appEvents.filter((e) =>  e.gameCompleted &&  e.walkedAway).length,
        rageQuit:     appEvents.filter((e) => !e.gameCompleted).length,
        openedAnyway: appEvents.filter((e) =>  e.gameCompleted && !e.walkedAway).length,
        succeeded:    appEvents.filter((e) => !(e.gameCompleted && !e.walkedAway)).length,
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
    walkedAway:       events.filter((e) =>  e.gameCompleted &&  e.walkedAway).length,
    openedAnyway:     events.filter((e) =>  e.gameCompleted && !e.walkedAway).length,
    rageQuit:         events.filter((e) => !e.gameCompleted).length,
    streakCurrent:    streak.current,
    streakBest:       streak.best,
    daysSinceInstall,
  };
}
