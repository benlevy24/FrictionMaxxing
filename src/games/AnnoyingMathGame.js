import { useState, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import AppText from '../components/AppText';
import Button from '../components/Button';
import { colors, spacing, radius } from '../theme';

// ── Seeded RNG ────────────────────────────────────────────────────────────────

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pickFrom(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Problem generators ────────────────────────────────────────────────────────
// Each returns { question: string, answer: number, note?: string }
// All answers are guaranteed positive integers.

function genArithmetic(rng) {
  // Two clearly-bracketed steps so order of operations isn't the trick.
  // We present it as "(A op B) op C = ?"
  const opChoices = ['+', '-', '×', '÷'];
  const op1 = pickFrom(rng, opChoices);
  const op2 = pickFrom(rng, ['+', '-', '×']); // avoid chained divisions

  let a, b, mid;

  if (op1 === '+') {
    a = randInt(rng, 12, 60);
    b = randInt(rng, 8, 40);
    mid = a + b;
  } else if (op1 === '-') {
    a = randInt(rng, 30, 80);
    b = randInt(rng, 5, a - 5);
    mid = a - b;
  } else if (op1 === '×') {
    a = randInt(rng, 3, 13);
    b = randInt(rng, 3, 12);
    mid = a * b;
  } else {
    // ÷  — pick b first, make a a multiple
    b = randInt(rng, 2, 9);
    a = b * randInt(rng, 2, 12);
    mid = a / b;
  }

  let c, answer;
  if (op2 === '+') {
    c = randInt(rng, 5, 30);
    answer = mid + c;
  } else if (op2 === '-') {
    c = randInt(rng, 2, mid - 1);
    answer = mid - c;
  } else {
    c = randInt(rng, 2, 8);
    answer = mid * c;
  }

  const sym1 = op1;
  const sym2 = op2;
  return {
    question: `What is (${a} ${sym1} ${b}) ${sym2} ${c}?`,
    answer,
  };
}

function genMissingNumber(rng) {
  const type = randInt(rng, 0, 3);

  if (type === 0) {
    // ? × a = b
    const a = randInt(rng, 3, 12);
    const answer = randInt(rng, 2, 11);
    return {
      question: `? × ${a} = ${answer * a}`,
      answer,
      note: 'find the missing number',
    };
  } else if (type === 1) {
    // a × ? + b = c
    const a = randInt(rng, 2, 9);
    const b = randInt(rng, 3, 20);
    const answer = randInt(rng, 2, 10);
    const c = a * answer + b;
    return {
      question: `${a} × ? + ${b} = ${c}`,
      answer,
      note: 'find the missing number',
    };
  } else if (type === 2) {
    // (? + a) × b = c
    const b = randInt(rng, 2, 8);
    const answer = randInt(rng, 2, 12);
    const a = randInt(rng, 1, 10);
    const c = (answer + a) * b;
    return {
      question: `(? + ${a}) × ${b} = ${c}`,
      answer,
      note: 'find the missing number',
    };
  } else {
    // a - ? × b = c  (answer = (a - c) / b)
    const b = randInt(rng, 2, 6);
    const answer = randInt(rng, 2, 8);
    const c = randInt(rng, 2, 15);
    const a = c + answer * b;
    return {
      question: `${a} - ? × ${b} = ${c}`,
      answer,
      note: 'find the missing number',
    };
  }
}

function genPercentage(rng) {
  // Friendly percentages that yield integer answers.
  const percentages = [5, 10, 15, 20, 25, 40, 50];
  const p = pickFrom(rng, percentages);
  // n must be divisible by (100/p)
  const factor = 100 / p;
  const multiplier = randInt(rng, 2, 20);
  const n = factor * multiplier;
  const answer = (p * n) / 100;
  return {
    question: `What is ${p}% of ${n}?`,
    answer,
  };
}

function genSequence(rng) {
  const type = randInt(rng, 0, 3);

  if (type === 0) {
    // Arithmetic: a, a+d, a+2d, a+3d, ?
    const a = randInt(rng, 1, 15);
    const d = randInt(rng, 2, 9);
    const terms = [a, a + d, a + 2 * d, a + 3 * d];
    return {
      question: `What comes next?\n${terms.join(', ')}, ?`,
      answer: a + 4 * d,
      note: 'complete the sequence',
    };
  } else if (type === 1) {
    // Geometric: a, a*r, a*r², a*r³, ? (small values)
    const a = randInt(rng, 1, 4);
    const r = randInt(rng, 2, 3);
    const terms = [a, a * r, a * r ** 2, a * r ** 3];
    return {
      question: `What comes next?\n${terms.join(', ')}, ?`,
      answer: a * r ** 4,
      note: 'complete the sequence',
    };
  } else if (type === 2) {
    // Squares: n², (n+1)², (n+2)², (n+3)², ?
    const n = randInt(rng, 1, 7);
    const terms = [n ** 2, (n + 1) ** 2, (n + 2) ** 2, (n + 3) ** 2];
    return {
      question: `What comes next?\n${terms.join(', ')}, ?`,
      answer: (n + 4) ** 2,
      note: 'complete the sequence',
    };
  } else {
    // Alternating add/multiply: a, a+d, (a+d)*m, (a+d)*m+d, ((a+d)*m+d)*m, ?
    // Simpler: every other term doubles, others add a constant
    const a = randInt(rng, 2, 8);
    const d = randInt(rng, 3, 7);
    // Pattern: +d, ×2, +d, ×2 ...
    const t1 = a;
    const t2 = a + d;
    const t3 = t2 * 2;
    const t4 = t3 + d;
    return {
      question: `What comes next?\n${t1}, ${t2}, ${t3}, ${t4}, ?`,
      answer: t4 * 2,
      note: 'complete the sequence',
    };
  }
}

const WORD_TEMPLATES = [
  {
    gen: (rng) => {
      const rows = randInt(rng, 4, 12);
      const cols = randInt(rng, 4, 12);
      const empty = randInt(rng, 2, rows * cols - 3);
      return {
        question: `A cinema has ${rows} rows of ${cols} seats.\n${empty} seats are empty.\nHow many are occupied?`,
        answer: rows * cols - empty,
      };
    },
  },
  {
    gen: (rng) => {
      const h = randInt(rng, 1, 3);
      const m = randInt(rng, 5, 55);
      return {
        question: `A movie is ${h} hour${h > 1 ? 's' : ''} and ${m} minutes long.\nHow many minutes is that?`,
        answer: h * 60 + m,
      };
    },
  },
  {
    gen: (rng) => {
      const price = randInt(rng, 3, 15);
      const qty = randInt(rng, 3, 9);
      const discount = price * randInt(rng, 1, Math.floor(qty / 2));
      const total = price * qty - discount;
      return {
        question: `You buy ${qty} items at $${price} each.\nYou have a $${discount} coupon.\nHow much do you pay?`,
        answer: total,
      };
    },
  },
  {
    gen: (rng) => {
      const start = randInt(rng, 20, 80);
      const give = randInt(rng, 3, start - 5);
      const find = randInt(rng, 2, 20);
      return {
        question: `You have ${start} coins.\nYou give ${give} away, then find ${find} more.\nHow many do you have?`,
        answer: start - give + find,
      };
    },
  },
  {
    gen: (rng) => {
      const workers = randInt(rng, 3, 8);
      const rate = randInt(rng, 4, 12); // items per hour
      const hours = randInt(rng, 2, 6);
      return {
        question: `${workers} workers each make ${rate} items per hour.\nHow many items do they make in ${hours} hours?`,
        answer: workers * rate * hours,
      };
    },
  },
  {
    gen: (rng) => {
      const total = randInt(rng, 20, 100);
      // fraction: 1/2, 1/4, 1/5 of total
      const fracs = [[1, 2], [1, 4], [1, 5]];
      const [num, den] = pickFrom(rng, fracs.filter(([, d]) => total % d === 0));
      const taken = (total * num) / den;
      return {
        question: `There are ${total} students.\n${num}/${den} of them go home early.\nHow many are left?`,
        answer: total - taken,
      };
    },
  },
];

function genWordProblem(rng) {
  const template = pickFrom(rng, WORD_TEMPLATES);
  return template.gen(rng);
}

// ── Problem picker ────────────────────────────────────────────────────────────

const GENERATORS = [
  genArithmetic,
  genArithmetic,       // weighted heavier
  genMissingNumber,
  genPercentage,
  genSequence,
  genWordProblem,
];

function generateProblem(seed) {
  const rng = makeRng(seed);
  const gen = pickFrom(rng, GENERATORS);
  try {
    const result = gen(rng);
    // Sanity check — answer should be a finite positive integer
    if (!Number.isFinite(result.answer) || result.answer < 0 || result.answer > 99999) {
      return genArithmetic(makeRng(seed + 1));
    }
    return result;
  } catch {
    return genArithmetic(makeRng(seed + 1));
  }
}

// ── Taunts ────────────────────────────────────────────────────────────────────

const WRONG_TAUNTS = [
  (ans) => `lol. it was ${ans}.`,
  (ans) => `nope. ${ans}.`,
  (ans) => `not even close. it was ${ans}.`,
  (ans) => `${ans}. that's the answer. ${ans}.`,
  (ans) => `bold guess. wrong. it was ${ans}.`,
  (ans) => `nice try. it was ${ans}.`,
];

const CORRECT_TAUNTS = [
  'fine. correct.',
  'okay, you got one.',
  'that one was easy anyway.',
  'lucky.',
  'correct. don\'t celebrate.',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Custom numpad ─────────────────────────────────────────────────────────────

const PAD_ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['-', '0', '⌫'],
];

function Numpad({ onDigit, onDelete, onNegate }) {
  return (
    <View style={padStyles.container}>
      {PAD_ROWS.map((row, ri) => (
        <View key={ri} style={padStyles.row}>
          {row.map((key) => (
            <TouchableOpacity
              key={key}
              style={padStyles.key}
              onPress={() => {
                if (key === '⌫') onDelete();
                else if (key === '-') onNegate();
                else onDigit(key);
              }}
              activeOpacity={0.6}
            >
              <AppText style={padStyles.keyText}>{key}</AppText>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

const KEY_SIZE = 76;

const padStyles = StyleSheet.create({
  container: { gap: 6 },
  row: { flexDirection: 'row', gap: 6 },
  key: {
    width: KEY_SIZE,
    height: 54,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontFamily: 'Comic Sans MS',
    fontSize: 22,
    color: colors.text,
  },
});

// ── Progress dots ─────────────────────────────────────────────────────────────

const NEEDED = 3;

function ProgressDots({ correct }) {
  return (
    <View style={progStyles.row}>
      {Array.from({ length: NEEDED }, (_, i) => (
        <View
          key={i}
          style={[progStyles.dot, i < correct && progStyles.dotFilled]}
        />
      ))}
    </View>
  );
}

const progStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
});

// ── Main component ────────────────────────────────────────────────────────────

export default function AnnoyingMathGame({ onComplete }) {
  const [baseSeed] = useState(() => Date.now());
  const [problemIndex, setProblemIndex] = useState(0);
  const [input, setInput] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState(null); // { correct: bool, message: string }
  const [taunt, setTaunt] = useState('');

  const problem = useMemo(
    () => generateProblem(baseSeed + problemIndex * 31337),
    [baseSeed, problemIndex]
  );

  const isWon = correctCount >= NEEDED;

  function handleDigit(d) {
    if (feedback) return;
    if (input.length >= 6) return;
    if (input === '0') setInput(d);
    else setInput((prev) => prev + d);
  }

  function handleDelete() {
    if (feedback) return;
    setInput((prev) => prev.slice(0, -1));
  }

  function handleNegate() {
    if (feedback) return;
    if (input.startsWith('-')) setInput(input.slice(1));
    else if (input.length > 0) setInput('-' + input);
  }

  function handleSubmit() {
    if (feedback || input === '' || input === '-') return;
    const guess = parseInt(input, 10);
    const correct = guess === problem.answer;

    if (correct) {
      const newCount = correctCount + 1;
      setCorrectCount(newCount);
      setFeedback({ correct: true, message: pick(CORRECT_TAUNTS) });
    } else {
      const tauntFn = pick(WRONG_TAUNTS);
      setFeedback({ correct: false, message: tauntFn(problem.answer) });
    }
  }

  function handleNext() {
    setFeedback(null);
    setInput('');
    setProblemIndex((n) => n + 1);
  }

  if (isWon) {
    return (
      <View style={styles.centered}>
        <AppText variant="xxl" style={styles.bigEmoji}>🔢</AppText>
        <AppText variant="subheading" style={styles.wonTitle}>
          fine. you can do math.
        </AppText>
        <AppText variant="caption" style={styles.wonSub}>
          {NEEDED} correct. go ahead.
        </AppText>
        <Button label="continue" variant="primary" onPress={onComplete} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <AppText variant="subheading">🔢 annoying math</AppText>
        <ProgressDots correct={correctCount} />
      </View>
      <AppText variant="caption" style={styles.needed}>
        get {NEEDED - correctCount} more correct
      </AppText>

      {/* Problem */}
      <View style={styles.problemBox}>
        {problem.note && (
          <AppText variant="caption" style={styles.problemNote}>
            {problem.note}
          </AppText>
        )}
        <AppText style={styles.problemText}>{problem.question}</AppText>
      </View>

      {/* Input display */}
      <View style={styles.inputBox}>
        <AppText style={[styles.inputText, input === '' && styles.inputPlaceholder]}>
          {input === '' ? '?' : input}
        </AppText>
      </View>

      {/* Feedback — shown after answer */}
      {feedback ? (
        <View style={styles.feedbackArea}>
          <AppText
            variant="caption"
            style={[
              styles.feedbackText,
              feedback.correct ? styles.feedbackCorrect : styles.feedbackWrong,
            ]}
          >
            {feedback.message}
          </AppText>
          {isWon ? null : (
            <Button label="next problem" variant="secondary" onPress={handleNext} />
          )}
        </View>
      ) : (
        <>
          <Numpad
            onDigit={handleDigit}
            onDelete={handleDelete}
            onNegate={handleNegate}
          />
          <TouchableOpacity
            style={[styles.submitBtn, input.length === 0 && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={input.length === 0 || input === '-'}
            activeOpacity={0.7}
          >
            <AppText style={styles.submitText}>submit</AppText>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  needed: {
    color: colors.textDisabled,
    alignSelf: 'flex-end',
    marginTop: -spacing.xs,
  },
  problemBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
    minHeight: 90,
    justifyContent: 'center',
  },
  problemNote: {
    color: colors.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  problemText: {
    fontFamily: 'Comic Sans MS',
    fontSize: 18,
    color: colors.text,
    lineHeight: 28,
  },
  inputBox: {
    width: '100%',
    height: 52,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  inputText: {
    fontFamily: 'Comic Sans MS',
    fontSize: 26,
    color: colors.text,
    letterSpacing: 2,
  },
  inputPlaceholder: {
    color: colors.textDisabled,
  },
  feedbackArea: {
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    justifyContent: 'center',
  },
  feedbackText: {
    fontFamily: 'Comic Sans MS',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  feedbackCorrect: {
    color: colors.success,
  },
  feedbackWrong: {
    color: colors.danger,
  },
  submitBtn: {
    width: KEY_SIZE * 3 + 6 * 2,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontFamily: 'Comic Sans MS',
    fontSize: 16,
    color: '#fff',
  },
  bigEmoji: {
    fontSize: 52,
  },
  wonTitle: {
    textAlign: 'center',
  },
  wonSub: {
    color: colors.textSub,
    textAlign: 'center',
  },
});
