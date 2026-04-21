import { useState, useEffect, useRef, useMemo } from 'react';
import { View, PanResponder, StyleSheet, Dimensions } from 'react-native';
import AppText from '../components/AppText';
import Button from '../components/Button';
import { colors, spacing, radius } from '../theme';

// ── Court dimensions ──────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
const GAME_W = SCREEN_W;
const GAME_H = 430;

// Ball
const BALL = 12;

// Player paddle — small and manageable
const P_W = 76;
const P_H = 11;
const P_Y = GAME_H - 46;

// AI paddle — wide and thick and menacing
const AI_W = 228;
const AI_H = 16;
const AI_Y = 30;

// Physics
const BASE_SPEED = 4.5;
const MAX_SPEED  = 9.5;
const MAX_ANGLE  = 6.5;    // max horizontal velocity component
const AI_SPEED   = 4.0;    // max px/frame AI can move — beatable with sharp angles
const AI_SPEEDUP = 0.45;   // speed added to ball each time AI hits it

// Center line dashes
const DASH_COUNT = 14;

// ── Taunts ────────────────────────────────────────────────────────────────────

const MISS_TAUNTS = [
  'the paddle is literally right there.',
  'too slow.',
  'that was coming right at you.',
  'incredible. miss again.',
  'you had one job.',
  'lmao.',
  'did you even try?',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Physics helpers ───────────────────────────────────────────────────────────

function makeBallVelocity(speed) {
  // Launch toward AI first (dy negative) with a slight random x
  const dx = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random() * 1.5);
  const dy = -Math.sqrt(speed * speed - dx * dx);
  return { dx, dy };
}

function initialPhysics() {
  const { dx, dy } = makeBallVelocity(BASE_SPEED);
  return {
    ballX: GAME_W / 2 - BALL / 2,
    ballY: GAME_H / 2 - BALL / 2,
    ballDX: dx,
    ballDY: dy,
    ballSpeed: BASE_SPEED,
    playerX: GAME_W / 2 - P_W / 2,
    aiX: GAME_W / 2 - AI_W / 2,
    phase: 'playing',     // 'playing' | 'player_scored' | 'ai_scored'
    rallyCount: 0,
    playerFlash: false,
    aiFlash: false,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PongGame({ onComplete }) {
  const physRef = useRef(initialPhysics());
  const [renderTick, setRenderTick] = useState(0);
  const [phase, setPhase] = useState('playing');
  const [missCount, setMissCount] = useState(0);
  const [taunt, setTaunt] = useState('');
  const touchX = useRef(null);

  // ── PanResponder — player moves paddle by dragging anywhere in the game ──
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        touchX.current = evt.nativeEvent.locationX;
      },
      onPanResponderMove: (evt) => {
        touchX.current = evt.nativeEvent.locationX;
      },
    })
  ).current;

  // ── Game loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const p = physRef.current;
      if (p.phase !== 'playing') return;

      // Player paddle follows finger
      if (touchX.current !== null) {
        p.playerX = Math.max(0, Math.min(GAME_W - P_W, touchX.current - P_W / 2));
      }

      // Move ball
      p.ballX += p.ballDX;
      p.ballY += p.ballDY;

      // Wall bounces (left / right)
      if (p.ballX <= 0)              { p.ballX = 0;              p.ballDX = Math.abs(p.ballDX); }
      if (p.ballX >= GAME_W - BALL)  { p.ballX = GAME_W - BALL;  p.ballDX = -Math.abs(p.ballDX); }

      const ballCX = p.ballX + BALL / 2;
      const ballBottom = p.ballY + BALL;
      const ballTop = p.ballY;

      // ── Player paddle collision ──
      const hitPlayer =
        p.ballDY > 0 &&
        ballBottom >= P_Y &&
        ballBottom <= P_Y + P_H + Math.abs(p.ballDY) &&
        ballCX >= p.playerX &&
        ballCX <= p.playerX + P_W;

      if (hitPlayer) {
        const hitPos = (ballCX - (p.playerX + P_W / 2)) / (P_W / 2); // -1 to +1
        const newDX = hitPos * MAX_ANGLE;
        const dy = -Math.sqrt(Math.max(p.ballSpeed ** 2 - newDX ** 2, 1));
        p.ballDX = newDX;
        p.ballDY = dy;
        p.ballY = P_Y - BALL;
        p.rallyCount++;
        p.playerFlash = true;
        setTimeout(() => { p.playerFlash = false; }, 140);
      }

      // ── AI paddle collision ──
      const hitAI =
        p.ballDY < 0 &&
        ballTop <= AI_Y + AI_H &&
        ballTop >= AI_Y - Math.abs(p.ballDY) &&
        ballCX >= p.aiX &&
        ballCX <= p.aiX + AI_W;

      if (hitAI) {
        const hitPos = (ballCX - (p.aiX + AI_W / 2)) / (AI_W / 2);
        // AI hits harder — ball speeds up
        const newSpeed = Math.min(p.ballSpeed + AI_SPEEDUP, MAX_SPEED);
        p.ballSpeed = newSpeed;
        // AI returns mostly centered (harder to angle past the big paddle)
        const newDX = hitPos * MAX_ANGLE * 0.65;
        const dy = Math.sqrt(Math.max(newSpeed ** 2 - newDX ** 2, 1));
        p.ballDX = newDX;
        p.ballDY = dy;
        p.ballY = AI_Y + AI_H;
        p.rallyCount++;
        p.aiFlash = true;
        setTimeout(() => { p.aiFlash = false; }, 140);
      }

      // ── Scoring ──
      if (ballTop < -BALL * 3) {
        p.phase = 'player_scored';
        setPhase('player_scored');
        setRenderTick((n) => n + 1);
        return;
      }
      if (ballBottom > GAME_H + BALL * 3) {
        p.phase = 'ai_scored';
        setMissCount((n) => n + 1);
        setTaunt(pick(MISS_TAUNTS));
        setPhase('ai_scored');
        setRenderTick((n) => n + 1);
        return;
      }

      // ── AI movement — limited speed so sharp angles can beat it ──
      const targetAiX = ballCX - AI_W / 2;
      const diff = targetAiX - p.aiX;
      const move = Math.sign(diff) * Math.min(Math.abs(diff), AI_SPEED);
      p.aiX = Math.max(0, Math.min(GAME_W - AI_W, p.aiX + move));

      setRenderTick((n) => n + 1);
    }, 16);

    return () => clearInterval(id);
  }, []);

  // ── Retry — reset ball, keep playing ─────────────────────────────────────
  function handleRetry() {
    const { dx, dy } = makeBallVelocity(BASE_SPEED);
    const p = physRef.current;
    p.ballX = GAME_W / 2 - BALL / 2;
    p.ballY = GAME_H / 2 - BALL / 2;
    p.ballDX = dx;
    p.ballDY = dy;
    p.ballSpeed = BASE_SPEED;
    p.rallyCount = 0;
    p.phase = 'playing';
    setPhase('playing');
    setTaunt('');
  }

  // Read physics ref for render (renderTick ensures freshness)
  const p = physRef.current;
  const ballColor = p.aiFlash ? colors.danger : colors.text;
  const playerColor = p.playerFlash ? '#fff' : colors.primary;

  return (
    <View style={styles.wrapper}>

      {/* Labels */}
      <View style={styles.labelsRow}>
        <AppText variant="caption" style={[styles.label, { color: colors.danger }]}>
          THE MACHINE
        </AppText>
        <AppText variant="caption" style={styles.rallyLabel}>
          {phase === 'playing' && p.rallyCount > 0 ? `rally ${p.rallyCount}` : ''}
        </AppText>
        <AppText variant="caption" style={[styles.label, { color: colors.primary }]}>
          YOU
        </AppText>
      </View>

      {/* Game court */}
      <View style={styles.court} {...panResponder.panHandlers}>

        {/* Center dashed line */}
        <View style={styles.centerLine}>
          {Array.from({ length: DASH_COUNT }, (_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </View>

        {/* AI paddle — big red menace */}
        <View
          style={[
            styles.aiPaddle,
            {
              left: p.aiX,
              top: AI_Y,
              width: AI_W,
              height: AI_H,
              backgroundColor: p.aiFlash ? '#FF6666' : colors.danger,
            },
          ]}
        />

        {/* Ball */}
        <View
          style={[
            styles.ball,
            {
              left: p.ballX,
              top: p.ballY,
              backgroundColor: ballColor,
            },
          ]}
        />

        {/* Player paddle */}
        <View
          style={[
            styles.playerPaddle,
            {
              left: p.playerX,
              top: P_Y,
              width: P_W,
              height: P_H,
              backgroundColor: playerColor,
            },
          ]}
        />

        {/* Phase overlays */}
        {phase === 'player_scored' && (
          <View style={styles.overlay}>
            <AppText style={styles.overlayTitle}>POINT!</AppText>
            <AppText variant="caption" style={styles.overlaySub}>
              you got past it.
            </AppText>
          </View>
        )}
        {phase === 'ai_scored' && (
          <View style={styles.overlay}>
            <AppText style={styles.overlayTitle}>{taunt}</AppText>
          </View>
        )}
      </View>

      {/* Action area below court */}
      <View style={styles.actions}>
        {phase === 'playing' && (
          <AppText variant="caption" style={styles.hint}>
            drag anywhere to move your paddle
          </AppText>
        )}
        {phase === 'ai_scored' && (
          <View style={styles.actionButtons}>
            <Button label="try again" variant="secondary" onPress={handleRetry} />
            <Button label="just let me through" variant="ghost" onPress={onComplete} />
          </View>
        )}
        {phase === 'player_scored' && (
          <Button label="escape" variant="primary" onPress={onComplete} />
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
  },

  // Labels row above court
  labelsRow: {
    width: GAME_W,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  rallyLabel: {
    color: colors.textDisabled,
  },

  // Court
  court: {
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#080810',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#222244',
    overflow: 'hidden',
    position: 'relative',
  },

  // Center dashed line
  centerLine: {
    position: 'absolute',
    top: GAME_H / 2 - 1,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  dash: {
    width: 18,
    height: 3,
    backgroundColor: '#1A1A2E',
  },

  // Paddles and ball — all positioned absolutely
  aiPaddle: {
    position: 'absolute',
    borderRadius: 4,
  },
  playerPaddle: {
    position: 'absolute',
    borderRadius: 3,
  },
  ball: {
    position: 'absolute',
    width: BALL,
    height: BALL,
    borderRadius: 2, // slightly square = more retro
  },

  // Phase overlay (centered inside court)
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,8,16,0.7)',
    gap: spacing.sm,
  },
  overlayTitle: {
    fontFamily: 'Comic Sans MS',
    fontSize: 32,
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  overlaySub: {
    color: colors.success,
  },

  // Below-court area
  actions: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    minHeight: 60,
    justifyContent: 'center',
  },
  hint: {
    color: colors.textDisabled,
    textAlign: 'center',
  },
  actionButtons: {
    width: '100%',
    gap: spacing.sm,
  },
});
