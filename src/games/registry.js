// Game registry — the single source of truth for all available games.
// To add a new game:
//   1. Build the component in src/games/ — it must accept an `onComplete` prop
//   2. Import it here and add an entry to GAMES
//   3. That's it. GameScreen picks from this list automatically.

import PlaceholderGame from './PlaceholderGame';
import TicTacToeGame from './TicTacToeGame';
import ConfusingMazeGame from './ConfusingMazeGame';
import ObscureHangmanGame from './ObscureHangmanGame';
import AnnoyingMathGame from './AnnoyingMathGame';
import StroopGame from './StroopGame';
import PongGame from './PongGame';
import SnakeGame from './SnakeGame';
import CheckersGame from './CheckersGame';
import ChessGame from './ChessGame';

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
    label: 'Tic-Tac-Toe',
    emoji: '❌',
    component: TicTacToeGame,
  },
  {
    id: 'maze',
    label: 'Maze',
    emoji: '🌀',
    component: ConfusingMazeGame,
  },
  {
    id: 'hangman',
    label: 'Hangperson',
    emoji: '🪢',
    component: ObscureHangmanGame,
  },
  {
    id: 'math',
    label: 'Math',
    emoji: '🔢',
    component: AnnoyingMathGame,
  },
  {
    id: 'stroop',
    label: 'Stroop Test',
    emoji: '🎨',
    component: StroopGame,
  },
  {
    id: 'pong',
    label: 'Pong',
    emoji: '🏓',
    component: PongGame,
  },
  {
    id: 'snake',
    label: 'Snake',
    emoji: '🐍',
    component: SnakeGame,
  },
  {
    id: 'checkers',
    label: 'Checkers',
    emoji: '🔴',
    component: CheckersGame,
  },
  {
    id: 'chess',
    label: 'Chess',
    emoji: '♟️',
    component: ChessGame,
  },
];

// Returns a random game from the enabled set.
// enabledIds: string[] — from user settings (task #16 will pass real prefs)
export function pickRandomGame(enabledIds) {
  const pool = GAMES.filter((g) => enabledIds.includes(g.id));
  if (pool.length === 0) return GAMES[0]; // fallback: never show nothing
  return pool[Math.floor(Math.random() * pool.length)];
}
