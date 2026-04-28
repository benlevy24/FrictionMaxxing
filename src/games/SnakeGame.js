import { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import AppText from '../components/AppText';
import { colors, spacing, radius } from '../theme';

// ── Config per difficulty ─────────────────────────────────────────────────────

const CONFIGS = {
  easy:   { cols: 15, rows: 15, speed: 220, goal: 1 },
  medium: { cols: 12, rows: 12, speed: 160, goal: 3 },
  hard:   { cols: 9,  rows: 9,  speed: 100, goal: 5 },
};

const GRID_PX = 279; // fixed display size — cells sized to fit

// ── Helpers ───────────────────────────────────────────────────────────────────

const DIR = {
  UP:    { x: 0,  y: -1 },
  DOWN:  { x: 0,  y:  1 },
  LEFT:  { x: -1, y:  0 },
  RIGHT: { x: 1,  y:  0 },
};

function isOpposite(a, b) {
  return a.x === -b.x && a.y === -b.y;
}

function randomFood(cols, rows, snake) {
  const occupied = new Set(snake.map((s) => `${s.x},${s.y}`));
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows),
    };
  } while (occupied.has(`${pos.x},${pos.y}`));
  return pos;
}

const DEATH_TAUNTS = [
  'yikes.',
  'you walked into a wall.',
  'the wall was right there.',
  'did you see that coming? because i did.',
  'skill issue.',
  'touching grass would go better for you.',
];

function randomTaunt() {
  return DEATH_TAUNTS[Math.floor(Math.random() * DEATH_TAUNTS.length)];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SnakeGame({ onComplete, difficulty = 'medium' }) {
  const config = CONFIGS[difficulty] ?? CONFIGS.medium;
  const { cols, rows, speed, goal } = config;
  const cellSize = Math.floor(GRID_PX / Math.max(cols, rows));
  const gridW = cellSize * cols;
  const gridH = cellSize * rows;

  const startPos = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };

  const [snake,     setSnake]     = useState([startPos]);
  const [food,      setFood]      = useState(() => randomFood(cols, rows, [startPos]));
  const [dir,       setDir]       = useState(DIR.RIGHT);
  const [foodEaten, setFoodEaten] = useState(0);
  const [deaths,    setDeaths]    = useState(0);
  const [status,    setStatus]    = useState('playing'); // 'playing' | 'dead' | 'complete'
  const [taunt,     setTaunt]     = useState('');

  // Refs so the interval reads fresh state without stale closures
  const stateRef = useRef({});
  stateRef.current = { snake, food, dir, foodEaten, status };

  // Pending direction: queued from button press, consumed on next tick
  const pendingDir = useRef(null);

  // ── Game loop ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'playing') return;

    const interval = setInterval(() => {
      const { snake, food, dir, foodEaten } = stateRef.current;

      // Apply queued direction change (ignore if it would reverse)
      const nextDir =
        pendingDir.current && !isOpposite(pendingDir.current, dir)
          ? pendingDir.current
          : dir;
      pendingDir.current = null;
      if (nextDir !== dir) setDir(nextDir);

      const head = snake[0];
      let newHead = { x: head.x + nextDir.x, y: head.y + nextDir.y };

      // Wall collision — easy and hard wrap, medium dies
      if (difficulty === 'easy' || difficulty === 'hard') {
        newHead = {
          x: (newHead.x + cols) % cols,
          y: (newHead.y + rows) % rows,
        };
      } else if (newHead.x < 0 || newHead.x >= cols || newHead.y < 0 || newHead.y >= rows) {
        setStatus('dead');
        setDeaths((d) => d + 1);
        setTaunt(randomTaunt());
        return;
      }

      // Self collision → die
      if (snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
        setStatus('dead');
        setDeaths((d) => d + 1);
        setTaunt(randomTaunt());
        return;
      }

      const ateFood = newHead.x === food.x && newHead.y === food.y;
      const newSnake = ateFood
        ? [newHead, ...snake]             // grow
        : [newHead, ...snake.slice(0, -1)]; // slide

      setSnake(newSnake);

      if (ateFood) {
        const newCount = foodEaten + 1;
        setFoodEaten(newCount);
        if (newCount >= goal) {
          setStatus('complete');
        } else {
          setFood(randomFood(cols, rows, newSnake));
        }
      }
    }, speed);

    return () => clearInterval(interval);
  }, [status, speed, cols, rows, goal, difficulty]);

  // ── Controls ─────────────────────────────────────────────────────────────────
  function press(newDir) {
    pendingDir.current = newDir;
  }

  // ── Restart (food count persists) ────────────────────────────────────────────
  function restart() {
    const pos = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
    setSnake([pos]);
    setFood(randomFood(cols, rows, [pos]));
    setDir(DIR.RIGHT);
    pendingDir.current = null;
    setStatus('playing');
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  const snakeSet = new Set(snake.map((s) => `${s.x},${s.y}`));

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <AppText variant="subheading">🐍 snake</AppText>
        <AppText variant="caption" style={styles.progress}>
          {foodEaten}/{goal} food eaten
          {deaths > 0 ? `  ·  ${deaths} death${deaths !== 1 ? 's' : ''}` : ''}
        </AppText>
      </View>

      {/* Grid */}
      <View style={[styles.grid, { width: gridW, height: gridH }]}>

        {/* Grid lines */}
        {Array.from({ length: rows }, (_, y) =>
          Array.from({ length: cols }, (_, x) => (
            <View
              key={`g${x},${y}`}
              style={[
                styles.gridCell,
                { width: cellSize, height: cellSize, left: x * cellSize, top: y * cellSize },
              ]}
            />
          ))
        )}

        {/* Food */}
        <View
          style={[
            styles.food,
            {
              width:  cellSize - 2,
              height: cellSize - 2,
              left:   food.x * cellSize + 1,
              top:    food.y * cellSize + 1,
            },
          ]}
        />

        {/* Snake */}
        {snake.map((seg, i) => (
          <View
            key={i}
            style={[
              styles.seg,
              i === 0 && styles.segHead,
              {
                width:  cellSize - 2,
                height: cellSize - 2,
                left:   seg.x * cellSize + 1,
                top:    seg.y * cellSize + 1,
              },
            ]}
          />
        ))}

        {/* Death overlay */}
        {status === 'dead' && (
          <View style={[styles.overlay, { width: gridW, height: gridH }]}>
            <AppText variant="base" style={styles.overlayTaunt}>{taunt}</AppText>
            <AppText variant="caption" style={styles.overlaySub}>
              {foodEaten}/{goal} — deaths don't reset your count
            </AppText>
            <TouchableOpacity style={styles.overlayBtn} onPress={restart}>
              <AppText variant="base" style={styles.overlayBtnText}>try again</AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* Complete overlay */}
        {status === 'complete' && (
          <View style={[styles.overlay, { width: gridW, height: gridH }]}>
            <AppText variant="base" style={styles.completeText}>
              {goal === 1 ? 'one piece of food. congratulations.' : `${goal} food. fine, you did it.`}
            </AppText>
            <TouchableOpacity style={[styles.overlayBtn, styles.completeBtn]} onPress={onComplete}>
              <AppText variant="base" style={styles.completeBtnText}>continue →</AppText>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* D-pad */}
      {status === 'playing' && (
        <View style={styles.dpad}>
          <View style={styles.dpadRow}>
            <View style={styles.dpadSpacer} />
            <TouchableOpacity style={styles.dpadBtn} onPress={() => press(DIR.UP)}>
              <AppText style={styles.dpadArrow}>▲</AppText>
            </TouchableOpacity>
            <View style={styles.dpadSpacer} />
          </View>
          <View style={styles.dpadRow}>
            <TouchableOpacity style={styles.dpadBtn} onPress={() => press(DIR.LEFT)}>
              <AppText style={styles.dpadArrow}>◀</AppText>
            </TouchableOpacity>
            <View style={styles.dpadCenter} />
            <TouchableOpacity style={styles.dpadBtn} onPress={() => press(DIR.RIGHT)}>
              <AppText style={styles.dpadArrow}>▶</AppText>
            </TouchableOpacity>
          </View>
          <View style={styles.dpadRow}>
            <View style={styles.dpadSpacer} />
            <TouchableOpacity style={styles.dpadBtn} onPress={() => press(DIR.DOWN)}>
              <AppText style={styles.dpadArrow}>▼</AppText>
            </TouchableOpacity>
            <View style={styles.dpadSpacer} />
          </View>
        </View>
      )}

    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const DPAD_BTN = 52;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  progress: {
    color: colors.textSub,
  },

  // Grid
  grid: {
    position: 'relative',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  gridCell: {
    position: 'absolute',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  food: {
    position: 'absolute',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  seg: {
    position: 'absolute',
    backgroundColor: colors.success,
    borderRadius: 2,
  },
  segHead: {
    backgroundColor: '#6BBF85', // slightly brighter than body
    borderRadius: 3,
  },

  // Overlays
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(17,17,17,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  overlayTaunt: {
    color: colors.danger,
    textAlign: 'center',
  },
  overlaySub: {
    color: colors.textSub,
    textAlign: 'center',
  },
  overlayBtn: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overlayBtnText: {
    color: colors.text,
  },
  completeText: {
    color: colors.success,
    textAlign: 'center',
  },
  completeBtn: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  completeBtnText: {
    color: '#fff',
  },

  // D-pad
  dpad: {
    gap: 2,
  },
  dpadRow: {
    flexDirection: 'row',
    gap: 2,
  },
  dpadBtn: {
    width: DPAD_BTN,
    height: DPAD_BTN,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadCenter: {
    width: DPAD_BTN,
    height: DPAD_BTN,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
  },
  dpadSpacer: {
    width: DPAD_BTN,
    height: DPAD_BTN,
  },
  dpadArrow: {
    color: colors.text,
    fontSize: 18,
  },
});
