import { useState, useMemo, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import AppText from '../components/AppText';
import Button from '../components/Button';
import { colors, spacing, radius } from '../theme';

// ── Constants ─────────────────────────────────────────────────────────────────

const WALL = 1.5;

const CONFIGS = {
  easy:   { rows: 9,  cols: 9,  fogRadius: 99, cell: 31 }, // fogRadius 99 = no fog
  medium: { rows: 11, cols: 11, fogRadius: 3,  cell: 27 },
  hard:   { rows: 15, cols: 15, fogRadius: 2,  cell: 20 },
};

// ── Seeded RNG ────────────────────────────────────────────────────────────────

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ── Maze generation (recursive backtracking) ──────────────────────────────────

const DIRS = ['N', 'E', 'S', 'W'];
const DELTA = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
const OPPOSITE = { N: 'S', E: 'W', S: 'N', W: 'E' };

function generateMaze(seed, rows, cols) {
  const rng = makeRng(seed);
  const exit = { row: rows - 1, col: cols - 1 };

  const cells = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ N: true, E: true, S: true, W: true }))
  );
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

  function carve(r, c) {
    visited[r][c] = true;
    const dirs = [...DIRS];
    for (let i = 3; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    for (const dir of dirs) {
      const [dr, dc] = DELTA[dir];
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
        cells[r][c][dir] = false;
        cells[nr][nc][OPPOSITE[dir]] = false;
        carve(nr, nc);
      }
    }
  }

  carve(0, 0);

  const phantoms = new Set();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      for (const dir of ['E', 'S']) {
        if (!cells[r][c][dir]) {
          const [dr, dc] = DELTA[dir];
          const nr = r + dr, nc = c + dc;
          if (nr < rows && nc < cols) {
            const nearExit =
              (r === exit.row && c === exit.col) ||
              (nr === exit.row && nc === exit.col);
            if (!nearExit && rng() < 0.10) {
              phantoms.add(`${r},${c},${dir}`);
              phantoms.add(`${nr},${nc},${OPPOSITE[dir]}`);
            }
          }
        }
      }
    }
  }

  return { cells, phantoms, exit };
}

// ── Taunts ────────────────────────────────────────────────────────────────────

const WALL_TAUNTS = [
  'wall.',
  'that\'s a wall.',
  'that direction: no.',
  'nope.',
  'blocked.',
];

const PHANTOM_TAUNTS = [
  'wait — that worked?',
  'huh.',
  'surprise.',
  'it wasn\'t actually a wall.',
  'interesting choice. somehow correct.',
];

const IDLE_TAUNTS = [
  'the exit exists. probably.',
  'going in circles?',
  'you\'ve been here before.',
  'maybe try the other way.',
  'still lost, huh.',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ConfusingMazeGame({ onComplete, difficulty = 'medium' }) {
  const { rows, cols, fogRadius, cell: cellPx } = CONFIGS[difficulty] ?? CONFIGS.medium;
  const [baseSeed] = useState(() => Date.now());
  const [attemptCount, setAttemptCount] = useState(0);
  const [playerPos, setPlayerPos] = useState({ row: 0, col: 0 });
  const [moveCount, setMoveCount] = useState(0);
  const [taunt, setTaunt] = useState('find the exit. how hard can it be.');
  const [completed, setCompleted] = useState(false);

  const { cells, phantoms, exit } = useMemo(
    () => generateMaze(baseSeed + attemptCount * 77777, rows, cols),
    [baseSeed, attemptCount, rows, cols]
  );

  // What the cell visually LOOKS like (real walls + phantom fakes on easy/medium only)
  function displayWall(r, c, dir) {
    return cells[r][c][dir] || (difficulty !== 'hard' && phantoms.has(`${r},${c},${dir}`));
  }

  function move(dir) {
    if (completed) return;
    const { row, col } = playerPos;
    const isRealWall = cells[row][col][dir];
    const isPhantom = !isRealWall && phantoms.has(`${row},${col},${dir}`);

    if (isRealWall) {
      if (Math.random() < 0.4) setTaunt(pick(WALL_TAUNTS));
      return;
    }

    if (isPhantom) {
      setTaunt(pick(PHANTOM_TAUNTS));
    } else if (moveCount > 0 && moveCount % 12 === 0) {
      setTaunt(pick(IDLE_TAUNTS));
    }

    const [dr, dc] = DELTA[dir];
    const newPos = { row: row + dr, col: col + dc };
    setPlayerPos(newPos);
    setMoveCount((n) => n + 1);

    if (newPos.row === exit.row && newPos.col === exit.col) {
      setCompleted(true);
      setTaunt(`escaped in ${moveCount + 1} moves. not great.`);
    }
  }

  // Keyboard support for web/desktop testing
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowUp')    move('N');
      if (e.key === 'ArrowDown')  move('S');
      if (e.key === 'ArrowLeft')  move('W');
      if (e.key === 'ArrowRight') move('E');
    };
    window.addEventListener?.('keydown', handler);
    return () => window.removeEventListener?.('keydown', handler);
  });

  function retry() {
    setAttemptCount((n) => n + 1);
    setPlayerPos({ row: 0, col: 0 });
    setMoveCount(0);
    setCompleted(false);
    setTaunt('new maze. fresh humiliation.');
  }

  function isVisible(r, c) {
    return (
      Math.abs(r - playerPos.row) <= fogRadius &&
      Math.abs(c - playerPos.col) <= fogRadius
    );
  }

  return (
    <View style={styles.container}>
      <AppText variant="subheading" style={styles.title}>
        🌀 maze
      </AppText>
      <AppText variant="caption" style={styles.taunt} numberOfLines={1}>
        {taunt}
      </AppText>

      {/* Maze */}
      <View style={styles.mazeWrapper}>
        {Array.from({ length: rows }, (_, r) => (
          <View key={r} style={styles.mazeRow}>
            {Array.from({ length: cols }, (_, c) => {
              const visible = isVisible(r, c);
              const isPlayer = r === playerPos.row && c === playerPos.col;
              const isExit = r === exit.row && c === exit.col;
              const markerSize = cellPx * 0.45;

              return (
                <View
                  key={c}
                  style={[
                    styles.cell,
                    { width: cellPx, height: cellPx,
                      borderTopWidth: displayWall(r, c, 'N') ? WALL : 0,
                      borderLeftWidth: displayWall(r, c, 'W') ? WALL : 0,
                      borderBottomWidth: r === rows - 1 && displayWall(r, c, 'S') ? WALL : 0,
                      borderRightWidth: c === cols - 1 && displayWall(r, c, 'E') ? WALL : 0,
                    },
                    !visible && styles.fogCell,
                  ]}
                >
                  {visible && isPlayer && (
                    <View style={[styles.marker, styles.playerMarker,
                      { width: markerSize, height: markerSize }]} />
                  )}
                  {isExit && !isPlayer && (
                    <View style={[styles.marker, styles.exitMarker,
                      { width: markerSize, height: markerSize }]} />
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* D-pad */}
      <View style={styles.dpad}>
        <View style={styles.dpadRow}>
          <View style={styles.dpadSpacer} />
          <DpadBtn label="↑" onPress={() => move('N')} />
          <View style={styles.dpadSpacer} />
        </View>
        <View style={styles.dpadRow}>
          <DpadBtn label="←" onPress={() => move('W')} />
          <View style={styles.dpadCenter} />
          <DpadBtn label="→" onPress={() => move('E')} />
        </View>
        <View style={styles.dpadRow}>
          <View style={styles.dpadSpacer} />
          <DpadBtn label="↓" onPress={() => move('S')} />
          <View style={styles.dpadSpacer} />
        </View>
      </View>

      <AppText variant="caption" style={styles.phantomHint}>
        some walls aren't real. try walking through them.
      </AppText>

      {/* Actions */}
      <View style={styles.actions}>
        {completed ? (
          <Button label="escape" variant="primary" onPress={onComplete} />
        ) : (
          <View style={styles.retryRow}>
            {attemptCount < 2 && (
              <AppText variant="caption" style={styles.hint}>
                maze #{attemptCount + 1}
              </AppText>
            )}
            <Button
              label={`try a different maze`}
              variant="ghost"
              onPress={retry}
            />
          </View>
        )}
      </View>
    </View>
  );
}

function DpadBtn({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.dpadBtn} onPress={onPress} activeOpacity={0.6}>
      <AppText style={styles.dpadText}>{label}</AppText>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const DPAD_BTN = 52;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  title: {
    textAlign: 'center',
  },
  taunt: {
    textAlign: 'center',
    minHeight: 18,
  },

  // Maze
  mazeWrapper: {
    borderColor: colors.border,
    marginVertical: spacing.sm,
  },
  mazeRow: {
    flexDirection: 'row',
  },
  cell: {
    borderColor: colors.textSub,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fogCell: {
    backgroundColor: colors.bg,
  },
  marker: {
    borderRadius: 99,
  },
  playerMarker: {
    backgroundColor: colors.primary,
  },
  exitMarker: {
    backgroundColor: colors.success,
  },

  // D-pad
  dpad: {
    gap: 2,
    marginTop: spacing.sm,
  },
  dpadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  dpadBtn: {
    width: DPAD_BTN,
    height: DPAD_BTN,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadText: {
    fontSize: 22,
    fontFamily: 'Comic Sans MS',
    color: colors.text,
  },
  dpadCenter: {
    width: DPAD_BTN,
    height: DPAD_BTN,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dpadSpacer: {
    width: DPAD_BTN,
    height: DPAD_BTN,
  },

  // Actions
  actions: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  retryRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  hint: {
    color: colors.textDisabled,
  },
  phantomHint: {
    color: colors.textDisabled,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
