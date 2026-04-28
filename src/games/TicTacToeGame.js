import { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import AppText from '../components/AppText';
import Button from '../components/Button';
import { colors, spacing, radius } from '../theme';

// ── Minimax logic ─────────────────────────────────────────────────────────────

const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

function getWinner(board) {
  for (const [a, b, c] of WINS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  return null;
}

function isBoardFull(board) {
  return board.every((cell) => cell !== null);
}

function minimax(board, isMaximizing) {
  const result = getWinner(board);
  if (result?.winner === 'O') return 10;
  if (result?.winner === 'X') return -10;
  if (isBoardFull(board)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'O';
        best = Math.max(best, minimax(board, false));
        board[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'X';
        best = Math.min(best, minimax(board, true));
        board[i] = null;
      }
    }
    return best;
  }
}

function getBestMove(board) {
  let bestScore = -Infinity;
  let bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'O';
      const score = minimax(board, false);
      board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }
  return bestMove;
}

function getRandomMove(board) {
  const empty = board.map((v, i) => (v === null ? i : -1)).filter((i) => i !== -1);
  return empty[Math.floor(Math.random() * empty.length)] ?? -1;
}

function getAIMove(board, difficulty) {
  if (difficulty === 'easy') return getRandomMove(board);
  if (difficulty === 'medium') return Math.random() < 0.6 ? getBestMove(board) : getRandomMove(board);
  return getBestMove(board); // hard
}

const WINS_NEEDED = { easy: 1, medium: 1, hard: 5 };

// ── Taunts ────────────────────────────────────────────────────────────────────

const LOSS_TAUNTS = [
  'lol.',
  'did you really think that would work?',
  'cute try though.',
  'i am literally a computer.',
  'you cannot beat me. ever.',
  'i have been waiting for that move.',
  'skill issue.',
];

const DRAW_TAUNTS = [
  'okay fine. a draw.',
  'respectable. still not a win.',
  'tie game. you tried.',
  'a draw is the best you\'ll ever do here.',
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Component ─────────────────────────────────────────────────────────────────

const RESULT = {
  NONE: null,
  AI_WINS: 'ai_wins',
  DRAW: 'draw',
};

const EMPTY_BOARD = Array(9).fill(null);

export default function TicTacToeGame({ onComplete, difficulty = 'medium' }) {
  const winsNeeded = WINS_NEEDED[difficulty] ?? 1;
  const [board, setBoard] = useState([...EMPTY_BOARD]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [result, setResult] = useState(RESULT.NONE);
  const [winLine, setWinLine] = useState(null);
  const [taunt, setTaunt] = useState('');
  const [attemptCount, setAttemptCount] = useState(1);
  const [successes, setSuccesses] = useState(0); // ties or wins earned

  // Check terminal state after every board change
  useEffect(() => {
    const winResult = getWinner(board);
    if (winResult) {
      setWinLine(winResult.line);
      if (winResult.winner === 'O') {
        setResult(RESULT.AI_WINS);
        setTaunt(randomFrom(LOSS_TAUNTS));
      } else {
        // Player won (only possible on easy/medium)
        const newSuccesses = successes + 1;
        setSuccesses(newSuccesses);
        setResult(RESULT.DRAW); // reuse draw state — triggers "continue" button
        setTaunt(newSuccesses >= winsNeeded ? 'okay fine. you win.' : `${newSuccesses}/${winsNeeded} — keep going.`);
      }
      return;
    }
    if (isBoardFull(board)) {
      const newSuccesses = successes + 1;
      setSuccesses(newSuccesses);
      setResult(RESULT.DRAW);
      setTaunt(newSuccesses >= winsNeeded ? randomFrom(DRAW_TAUNTS) : `${newSuccesses}/${winsNeeded} — not done yet.`);
    }
  }, [board]);

  // AI move — fires whenever it becomes the AI's turn
  useEffect(() => {
    if (isPlayerTurn || result !== RESULT.NONE) return;

    const timer = setTimeout(() => {
      setBoard((prev) => {
        const next = [...prev];
        const move = getAIMove(next, difficulty);
        if (move !== -1) next[move] = 'O';
        return next;
      });
      setIsPlayerTurn(true);
    }, 350);

    return () => clearTimeout(timer);
  }, [isPlayerTurn, result]);

  function handleCellPress(index) {
    if (!isPlayerTurn || board[index] || result !== RESULT.NONE) return;
    const next = [...board];
    next[index] = 'X';
    setBoard(next);
    setIsPlayerTurn(false);
  }

  function handleRetry() {
    setBoard([...EMPTY_BOARD]);
    setIsPlayerTurn(true);
    setResult(RESULT.NONE);
    setWinLine(null);
    setTaunt('');
    setAttemptCount((c) => c + 1);
  }

  const isTerminal = result !== RESULT.NONE;

  return (
    <View style={styles.container}>
      <AppText variant="subheading" style={styles.title}>
        ❌ tic-tac-toe
      </AppText>
      <AppText variant="caption" style={styles.subtitle}>
        {isTerminal
          ? taunt
          : isPlayerTurn
          ? 'your turn (X)'
          : 'thinking... 🤔'}
      </AppText>

      {/* Board */}
      <View style={styles.board}>
        {board.map((cell, i) => {
          const isWinCell = winLine?.includes(i);
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.cell,
                isWinCell && styles.cellWin,
                !cell && isPlayerTurn && !isTerminal && styles.cellTappable,
              ]}
              onPress={() => handleCellPress(i)}
              activeOpacity={0.7}
            >
              <AppText
                style={[
                  styles.cellText,
                  cell === 'X' && styles.cellX,
                  cell === 'O' && styles.cellO,
                  isWinCell && styles.cellTextWin,
                ]}
              >
                {cell ?? ''}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Result actions */}
      {isTerminal && (
        <View style={styles.resultArea}>
          {result === RESULT.AI_WINS && (
            <AppText variant="caption" style={styles.attemptNote}>
              attempt #{attemptCount}
            </AppText>
          )}
          {result === RESULT.DRAW ? (
            successes >= winsNeeded ? (
              <Button label="okay fine, continue" variant="primary" onPress={onComplete} />
            ) : (
              <Button label="play again" variant="secondary" onPress={handleRetry} />
            )
          ) : (
            <View style={styles.retryRow}>
              <Button label="try again" variant="secondary" onPress={handleRetry} />
              <Button label="just let me through" variant="ghost" onPress={onComplete} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const CELL_SIZE = 90;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    minHeight: 20,
  },
  board: {
    width: CELL_SIZE * 3 + spacing.sm * 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellTappable: {
    borderColor: colors.textDisabled,
  },
  cellWin: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  cellText: {
    fontSize: 36,
    fontFamily: 'Comic Sans MS',
  },
  cellX: {
    color: colors.text,
  },
  cellO: {
    color: colors.danger,
  },
  cellTextWin: {
    color: colors.primary,
  },
  resultArea: {
    width: '100%',
    gap: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  attemptNote: {
    color: colors.textDisabled,
  },
  retryRow: {
    width: '100%',
    gap: spacing.sm,
  },
});
