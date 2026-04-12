// Streak and milestone logic
// All state is in-memory for now — will be persisted in task #16 (AsyncStorage)

// --- Streak logic ---
// A "streak" = consecutive days with at least one interception.
// A LONGER streak is BAD — it means you kept trying to open blocked apps.
// Streak RESETS on a clean day (zero interceptions) — that's the win.

export function getStreakStatus(streakDays) {
  if (streakDays === 0) return { label: 'clean 🎉', color: 'success' };
  if (streakDays <= 3) return { label: `${streakDays} day streak`, color: 'warning' };
  return { label: `${streakDays} day streak 😬`, color: 'danger' };
}

// --- Walk-away milestones ---
// A walk-away = user completed the game but chose NOT to open the app.
// Milestones fire at these total walk-away counts:
export const TOTAL_MILESTONES = [1, 5, 10, 25, 50, 100];

// Per-app milestones fire at these counts:
export const APP_MILESTONES = [1, 5, 10, 25];

export function checkMilestone(count, milestones) {
  return milestones.includes(count) ? count : null;
}

export function getMilestoneMessage(count, appLabel = null) {
  if (appLabel) {
    const messages = {
      1: `first time walking away from ${appLabel}. it gets easier.`,
      5: `5 walk-aways from ${appLabel}. you're winning.`,
      10: `10 times you closed ${appLabel} instead. legend behavior.`,
      25: `25 walk-aways from ${appLabel}. at this point just delete the app.`,
    };
    return messages[count] ?? `${count} walk-aways from ${appLabel}.`;
  }

  const messages = {
    1: `first walk-away. the hardest one.`,
    5: `5 times you beat the game and still said no. that's willpower.`,
    10: `10 walk-aways. you're genuinely getting better at this.`,
    25: `25 walk-aways. honestly impressive.`,
    50: `50 walk-aways. you might not even need this app soon.`,
    100: `100 walk-aways. you've completed friction maxxing.`,
  };
  return messages[count] ?? `${count} total walk-aways. keep going.`;
}
