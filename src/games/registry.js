// Game registry — the single source of truth for all available games.
// To add a new game:
//   1. Build the component in src/games/ — it must accept an `onComplete` prop
//   2. Import it here and add an entry to GAMES
//   3. That's it. GameScreen picks from this list automatically.

import PlaceholderGame from './PlaceholderGame';

// Each entry shape:
// {
//   id: string          — matches the id used in Settings toggle
//   label: string       — display name
//   emoji: string       — used in Settings and game header
//   component: React component  — receives { onComplete }
// }
export const GAMES = [
  {
    id: 'tictactoe',
    label: 'Unbeatable Tic Tac Toe',
    emoji: '❌',
    component: PlaceholderGame,  // replaced in task #12
  },
  {
    id: 'maze',
    label: 'Confusing Maze',
    emoji: '🌀',
    component: PlaceholderGame,  // replaced in task #13
  },
  {
    id: 'hangman',
    label: 'Obscure Hangman',
    emoji: '🪢',
    component: PlaceholderGame,  // replaced in task #14
  },
  {
    id: 'math',
    label: 'Annoying Math',
    emoji: '🔢',
    component: PlaceholderGame,  // replaced in task #15
  },
];

// Returns a random game from the enabled set.
// enabledIds: string[] — from user settings (task #16 will pass real prefs)
export function pickRandomGame(enabledIds) {
  const pool = GAMES.filter((g) => enabledIds.includes(g.id));
  if (pool.length === 0) return GAMES[0]; // fallback: never show nothing
  return pool[Math.floor(Math.random() * pool.length)];
}
