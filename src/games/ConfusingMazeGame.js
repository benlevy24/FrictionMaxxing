import { useState, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import AppText from '../components/AppText';
import Button from '../components/Button';
import { colors, spacing, radius } from '../theme';

// ── Constants ─────────────────────────────────────────────────────────────────

const ROWS = 11;
const COLS = 11;
const CELL = 27;       // px per cell
const WALL = 1.5;      // border width
const FOG_RADIUS = 3;  // cells visible around player (7×7 window)
const EXIT = { row: ROWS - 1, col: COLS - 1 };

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

function generateMaze(seed) {
  const rng = makeRng(seed);

  // cells[r][c].{N,E,S,W} = true means wall present
  const cells = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ N: true, E: true, S: true, W: true }))
  );
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

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
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited[nr][nc]) {
        cells[r][c][dir] = false;
        cells[nr][nc][OPPOSITE[dir]] = false;
        carve(nr, nc);
      }
    }
  }

  carve(0, 0);

  // ── Phantom walls ─────────────────────────────────────────────────────────
  // ~18% of open interior passages get a phantom visual wall — looks blocked
  // but the player can walk through. Creates "wait, that worked?!" confusion.
  // Stored as Set of "r,c,dir" strings. Applied symmetrically.
  const phantoms = new Set();

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const dir of ['E', 'S']) {  // only check each passage once
        if (!cells[r][c][dir]) {
          const [dr, dc] = DELTA[dir];
          const nr = r + dr, nc = c + dc;
          if (nr < ROWS && nc < COLS) {
            // Skip passages adjacent to the exit — avoid trapping the player
            const nearExit =
              (r === EXIT.row && c === EXIT.col) ||
              (nr === EXIT.row && nc === EXIT.col);
            if (!nearExit && rng() < 0.18) {
              phantoms.add(`${r},${c},${dir}`);
              phantoms.add(`${nr},${nc},${OPPOSITE[dir]}`);
            }
          }
        }
      }
    }
  }

  return { cells, phantoms };
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

export default function ConfusingMazeGame({ onComplete }) {
  const [baseSeed] = useState(() => Date.now());
  const [attemptCount, setAttemptCount] = useState(0);
  const [playerPos, setPlayerPos] = useState({ row: 0, col: 0 });
  const [moveCount, setMoveCount] = useState(0);
  const [taunt, setTaunt] = useState('find the exit. how hard can it be.');
  const [completed, setCompleted] = useState(false);

  // Each attempt gets a unique seed → completely different maze layout
  const { cells, phantoms } = useMemo(
    () => generateMaze(baseSeed + attemptCount * 77777),
    [baseSeed, attemptCount]
  );

  // What the cell visually LOOKS like (real walls + phantom fakes)
  function displayWall(r, c, dir) {
    return cells[r][c][dir] || phantoms.has(`${r},${c},${dir}`);
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

    if (newPos.row === EXIT.row && newPos.col === EXIT.col) {
      setCompleted(true);
      setTaunt(`escaped in ${moveCount + 1} moves. not great.`);
    }
  }

  function retry() {
    setAttemptCount((n) => n + 1);
    setPlayerPos({ row: 0, col: 0 });
    setMoveCount(0);
    setCompleted(false);
    setTaunt('new maze. fresh humiliation.');
  }

  function isVisible(r, c) {
    return (
      Math.abs(r - playerPos.row) <= FOG_RADIUS &&
      Math.abs(c - playerPos.col) <= FOG_RADIUS
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
        {Array.from({ length: ROWS }, (_, r) => (
          <View key={r} style={styles.mazeRow}>
            {Array.from({ length: COLS }, (_, c) => {
              const visible = isVisible(r, c);
              const isPlayer = r === playerPos.row && c === playerPos.col;
              const isExit = r === EXIT.row && c === EXIT.col;

              return (
                <View
                  key={c}
                  style={[
                    styles.cell,
                    {
                      // N+W only for interior walls — S/E of adjacent cells handle the rest
                      borderTopWidth: displayWall(r, c, 'N') ? WALL : 0,
                      borderLeftWidth: displayWall(r, c, 'W') ? WALL : 0,
                      // Close outer boundary (last row / last col)
                      borderBottomWidth: r === ROWS - 1 && displayWall(r, c, 'S') ? WALL : 0,
                      borderRightWidth: c === COLS - 1 && displayWall(r, c, 'E') ? WALL : 0,
                    },
                    !visible && styles.fogCell,
                  ]}
                >
                  {visible && isPlayer && (
                    <View style={[styles.marker, styles.playerMarker]} />
                  )}
                  {visible && isExit && !isPlayer && (
                    <View style={[styles.marker, styles.exitMarker]} />
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
    width: CELL,
    height: CELL,
    borderColor: colors.textSub,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fogCell: {
    backgroundColor: colors.bg,
  },
  marker: {
    width: CELL * 0.45,
    height: CELL * 0.45,
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
});
