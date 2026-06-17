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

// iOS bundle IDs for each app — used by the native module to block/monitor apps.
// Custom apps added by the user won't have entries here; native blocking won't apply to them.
export const APP_BUNDLE_IDS = {
  instagram: 'com.burbn.instagram',
  tiktok:    'com.zhiliaoapp.musically',
  youtube:   'com.google.ios.youtube',
  x:         'com.atebits.Tweetie2',
  facebook:  'com.facebook.Facebook',
  snapchat:  'com.toyopagroup.picaboo',
  reddit:    'com.reddit.Reddit',
  chatgpt:   'com.openai.chat',
  threads:   'com.burbn.barcelona',
  linkedin:  'com.linkedin.LinkedIn',
  pinterest: 'com.pinterest',
};

export const DEFAULT_ENABLED_GAMES = [
  'tictactoe', 'maze', 'hangman', 'math', 'stroop', 'pong', 'snake', 'checkers', 'chess', 'gwam',
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
  enabledGames:       DEFAULT_ENABLED_GAMES,
  freeZones:          [],       // [{ id, name, lat, lng, radiusMeters }]
  scheduleBlock:      { enabled: false, startHour: 8, endHour: 17, activeDays: [0,1,2,3,4,5,6] }, // friction active window; activeDays: 0=Sun…6=Sat
  frictionMode:       'always',    // 'always' | 'threshold' | 'time_cap'
  difficulty:         'hard',   // 'easy' | 'hard' (medium exists internally but not exposed in UI)
  installDate:        null,     // set on first write
  onboardingDone:     false,
  appUsageEstimates:  {},       // { [appId]: { weeklyMinutes: number, weeklyPickups: number } } — manual stopgap; replaced by real data once screenTimePermissionGranted = true
  customApps:         [],       // [{ id, label, emoji }] — user-added apps beyond the defaults
  hiddenAppIds:       [],       // apps manually removed from the gated apps display
  timeConstraint:     { enabled: true },  // caps each session; user picks a duration before opening an app
  groupBudgets:       [],                 // [{ id, name, limitMinutes, appIds: string[] }]
  groupTimeCap:       { enabled: false }, // once a group's daily budget runs out, walk away is the only option (no friction game — just blocked)
  dailyUsageTimer:    { enabled: false, minutes: 30 }, // start intercepting after X min of use today (per-app); enforcement needs DeviceActivityMonitor (#20)
  dailyOpenLimit:     { enabled: false, limit: 3 }, // hard cap on opens per app per day; after N opens, walk away is the only option
  dailyQuota:         { enabled: false }, // must beat N games today before any gated app opens (N = 5/7/10 by difficulty); each app open plays 1 game then closes
  screentimeGoalMinutes: 120,             // daily screen time goal shown as ring on home screen (default 2 hours)

  // ── Screen Time permission flag (set to true in Mac task #20) ────────────────
  // When true, all "avg daily est." labels, Usage Estimates prompts, and estimate-based
  // calculations should be replaced with real DeviceActivityReport data:
  //
  //   HomeScreen ring        → real today's screen time (not weeklyMinutes/7 average)
  //   HomeScreen scatter     → real per-app daily screen time on y-axis
  //   InsightsScreen week    → real minutes saved (not estimate-based)
  //   GameScreen intercept   → real avg daily screen time per app (not weeklyMinutes/7)
  //   UsageEstimatesScreen   → hide the per-app estimate inputs; keep only the goal stepper
  //
  // The DeviceActivityMonitor Swift extension (task #20) should write real screen time
  // into a shared App Group UserDefaults that the JS layer reads via a native module.
  // Flip this flag to true once that bridge is wired up and returning valid data.
  screenTimePermissionGranted: false,
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

export function deriveTodayStats(events, date = null) {
  const d = date ?? getToday();
  const dayEvents = events.filter((e) => e.date === d);
  return {
    intercepted:  dayEvents.length,
    walkedAway:   dayEvents.filter((e) =>  e.gameCompleted &&  e.walkedAway).length,
    openedAnyway: dayEvents.filter((e) =>  e.gameCompleted && !e.walkedAway).length,
    rageQuit:     dayEvents.filter((e) => !e.gameCompleted).length,
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

export function deriveByAppStats(events) {
  const seen = new Map();
  for (const e of events) {
    if (!seen.has(e.appId)) seen.set(e.appId, { id: e.appId, label: e.appLabel, emoji: e.appEmoji });
  }
  return [...seen.values()]
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
    .sort((a, b) => b.intercepted - a.intercepted);
}

// Minutes saved = sum of avg session length for every walk-away or rage-quit.
// Avg session length per app = weeklyMinutes / weeklyPickups (user-entered from Screen Time).
// The weekly totals are used directly — no need to divide by 7 since it cancels out.
// "Opened anyway" events are not counted — the user spent that time in the app.
export function deriveMinutesSaved(events, appUsageEstimates = {}) {
  const savedEvents = events.filter((e) => e.walkedAway || !e.gameCompleted);
  let total = 0;
  for (const e of savedEvents) {
    const est = appUsageEstimates[e.appId];
    if (!est || !est.weeklyPickups || !est.weeklyMinutes) continue;
    total += est.weeklyMinutes / est.weeklyPickups;
  }
  return Math.round(total);
}

// Returns an array of 24 buckets (index = hour 0–23) with intercept count per hour for a given date.
export function deriveHourlyStats(events, date = null) {
  const d = date ?? getToday();
  const dayEvents = events.filter((e) => e.date === d);
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
  for (const e of dayEvents) {
    const h = new Date(e.timestamp).getHours();
    hours[h].count++;
  }
  return hours;
}

// Returns per-hour data for a given date, with per-app breakdown and topApp per slot.
// Shape: [{ hour, count, topApp: { id, emoji, label, count } | null, apps: [...] }]
export function deriveHourlyByApp(events, date = null) {
  const d = date ?? getToday();
  const dayEvents = events.filter((e) => e.date === d);
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0, topApp: null, apps: [] }));
  for (const e of dayEvents) {
    const h = new Date(e.timestamp).getHours();
    hours[h].count++;
    const existing = hours[h].apps.find((a) => a.id === e.appId);
    if (existing) { existing.count++; }
    else { hours[h].apps.push({ id: e.appId, emoji: e.appEmoji, label: e.appLabel, count: 1 }); }
  }
  for (const slot of hours) {
    slot.apps.sort((a, b) => b.count - a.count);
    slot.topApp = slot.apps[0] ?? null;
  }
  return hours;
}

// Returns a Set of date strings ('YYYY-MM-DD') that have at least one event.
export function getDatesWithEvents(events) {
  const dates = new Set();
  for (const e of events) dates.add(e.date);
  return dates;
}

// Returns apps sorted by daily estimated screen time (desc).
// Uses appUsageEstimates.weeklyMinutes / 7 as the daily average.
// Apps with no estimate are still included (sorted to bottom by intercept count for the given date.
export function deriveMostUsedApps(events, appUsageEstimates = {}, date = null) {
  const d = date ?? getToday();
  const todayEvents = events.filter((e) => e.date === d);

  // Build unique app set from estimates + today's events
  const appMap = new Map();

  // Seed from estimates
  for (const [appId, est] of Object.entries(appUsageEstimates)) {
    if (!appMap.has(appId)) {
      // Try to get label/emoji from events, fall back to appId
      const ev = events.find((e) => e.appId === appId);
      appMap.set(appId, {
        id: appId,
        label: ev?.appLabel ?? appId,
        emoji: ev?.appEmoji ?? '📱',
        avgDailyMinutes: est.weeklyMinutes ? Math.round(est.weeklyMinutes / 7) : 0,
        pickups: 0,
      });
    }
  }

  // Seed from today's events (apps not in estimates)
  for (const e of todayEvents) {
    if (!appMap.has(e.appId)) {
      appMap.set(e.appId, {
        id: e.appId,
        label: e.appLabel,
        emoji: e.appEmoji,
        avgDailyMinutes: 0,
        pickups: 0,
      });
    }
    appMap.get(e.appId).pickups++;
  }

  return [...appMap.values()]
    .sort((a, b) => b.avgDailyMinutes - a.avgDailyMinutes || b.pickups - a.pickups);
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
