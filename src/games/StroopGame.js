import { useState, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import AppText from '../components/AppText';
import { colors, spacing, radius } from '../theme';

// ── Colors ────────────────────────────────────────────────────────────────────

const STROOP_COLORS = [
  { name: 'RED',    hex: '#E05252' },
  { name: 'BLUE',   hex: '#4A90E0' },
  { name: 'GREEN',  hex: '#4CB87D' },
  { name: 'YELLOW', hex: '#D4A829' },
  { name: 'ORANGE', hex: '#D97B45' },
  { name: 'PURPLE', hex: '#9B59D6' },
];

const NEEDED_BY_DIFFICULTY = { easy: 3, medium: 5, hard: 7 };

// ── Taunts ────────────────────────────────────────────────────────────────────

const WRONG_TAUNTS_INK = [
  "that's the WORD. not the color.",
  "you're reading it. look at the ink.",
  "the TEXT color. ignore what it says.",
  "your brain is fighting you. that's the point.",
  "that's what it says. not what it looks like.",
  "stop reading. start seeing.",
];

const WRONG_TAUNTS_WORD = [
  "that's the ink color. read the word.",
  "we asked what it SAYS. not how it looks.",
  "ignore the color. read the actual word.",
  "your eyes lied to you.",
  "the word. the word itself. read it.",
  "that's the ink. the word is different.",
];

// ── Problem generator ─────────────────────────────────────────────────────────

function newProblem(prevWordIndex, prevInkIndex) {
  let inkIndex, wordIndex;
  do { inkIndex = Math.floor(Math.random() * STROOP_COLORS.length); }
  while (inkIndex === prevInkIndex);
  do { wordIndex = Math.floor(Math.random() * STROOP_COLORS.length); }
  while (wordIndex === inkIndex || wordIndex === prevWordIndex);
  return { inkIndex, wordIndex };
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StroopGame({ onComplete, difficulty = 'medium' }) {
  const needed = NEEDED_BY_DIFFICULTY[difficulty] ?? 5;
  const alternates = difficulty === 'medium' || difficulty === 'hard';

  const [problem, setProblem] = useState(() => newProblem(-1, -1));
  const [correctCount, setCorrectCount] = useState(0);
  // 'ink' = tap the ink color, 'word' = tap what the word spells
  const [questionType, setQuestionType] = useState(() =>
    alternates ? (Math.random() < 0.5 ? 'ink' : 'word') : 'ink'
  );
  const [feedback, setFeedback] = useState(null);
  const timeoutRef = useRef(null);

  const word = STROOP_COLORS[problem.wordIndex].name;
  const inkHex = STROOP_COLORS[problem.inkIndex].hex;
  const correctIndex = questionType === 'ink' ? problem.inkIndex : problem.wordIndex;

  function handleTap(colorIndex) {
    if (feedback) return;
    clearTimeout(timeoutRef.current);

    const correct = colorIndex === correctIndex;
    const newCount = correct ? correctCount + 1 : correctCount;
    if (correct) setCorrectCount(newCount);

    const taunts = questionType === 'ink' ? WRONG_TAUNTS_INK : WRONG_TAUNTS_WORD;
    setFeedback({
      correct,
      tappedIndex: colorIndex,
      message: correct ? null : pick(taunts),
    });

    timeoutRef.current = setTimeout(() => {
      setFeedback(null);
      if (newCount >= needed) {
        onComplete();
      } else {
        setProblem(newProblem(problem.wordIndex, problem.inkIndex));
        if (alternates) setQuestionType((t) => t === 'ink' ? 'word' : 'ink');
      }
    }, correct ? 450 : 1300);
  }

  const instruction = questionType === 'ink'
    ? 'tap the color the text is WRITTEN IN'
    : 'tap the color the word SPELLS OUT';

  return (
    <View style={styles.container}>
      <AppText variant="subheading" style={styles.title}>🎨 stroop test</AppText>
      <AppText variant="caption" style={styles.instruction}>
        {instruction}
      </AppText>

      {/* Progress dots */}
      <View style={styles.progress}>
        {Array.from({ length: needed }, (_, i) => (
          <View key={i} style={[styles.dot, i < correctCount && styles.dotFilled]} />
        ))}
      </View>

      {/* Word displayed in a conflicting ink color */}
      <View style={styles.wordBox}>
        <AppText style={[styles.word, { color: inkHex }]}>{word}</AppText>
      </View>

      {/* Feedback text */}
      <View style={styles.feedbackRow}>
        {feedback?.correct && (
          <AppText variant="caption" style={styles.feedbackCorrect}>✓</AppText>
        )}
        {feedback && !feedback.correct && (
          <AppText variant="caption" style={styles.feedbackWrong} numberOfLines={2}>
            {feedback.message}
          </AppText>
        )}
      </View>

      {/* 2×3 color button grid */}
      <View style={styles.grid}>
        {STROOP_COLORS.map((color, i) => {
          let borderStyle = {};
          if (feedback) {
            if (i === correctIndex) {
              borderStyle = { borderWidth: 3, borderColor: colors.success };
            } else if (i === feedback.tappedIndex && !feedback.correct) {
              borderStyle = { borderWidth: 3, borderColor: colors.danger };
            } else {
              borderStyle = { opacity: 0.45 };
            }
          }
          return (
            <TouchableOpacity
              key={i}
              style={[styles.colorBtn, { backgroundColor: color.hex }, borderStyle]}
              onPress={() => handleTap(i)}
              disabled={!!feedback}
              activeOpacity={0.75}
            >
              <AppText style={styles.colorBtnText}>{color.name}</AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const BTN_SIZE = 84;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  title: {
    textAlign: 'center',
  },
  instruction: {
    textAlign: 'center',
    color: colors.textSub,
  },
  progress: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.border,
  },
  dotFilled: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  wordBox: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  word: {
    fontFamily: 'Comic Sans MS',
    fontSize: 52,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  feedbackRow: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  feedbackCorrect: {
    fontSize: 22,
    color: colors.success,
  },
  feedbackWrong: {
    color: colors.danger,
    textAlign: 'center',
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    width: BTN_SIZE * 3 + 10 * 2,
  },
  colorBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  colorBtnText: {
    fontFamily: 'Comic Sans MS',
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
