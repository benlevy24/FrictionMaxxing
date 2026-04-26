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
  const opChoices = ['+', '-', '×', '÷'];
  const op1 = pickFrom(rng, opChoices);
  const op2 = pickFrom(rng, ['+', '-', '×']);

  let a, b, mid;

  if (op1 === '+') {
    a = randInt(rng, 12, 90);
    b = randInt(rng, 8, 60);
    mid = a + b;
  } else if (op1 === '-') {
    a = randInt(rng, 30, 120);
    b = randInt(rng, 5, a - 5);
    mid = a - b;
  } else if (op1 === '×') {
    a = randInt(rng, 3, 15);
    b = randInt(rng, 3, 14);
    mid = a * b;
  } else {
    b = randInt(rng, 2, 12);
    a = b * randInt(rng, 2, 15);
    mid = a / b;
  }

  let c, answer;
  if (op2 === '+') {
    c = randInt(rng, 5, 40);
    answer = mid + c;
  } else if (op2 === '-') {
    c = randInt(rng, 2, mid - 1);
    answer = mid - c;
  } else {
    c = randInt(rng, 2, 9);
    answer = mid * c;
  }

  return {
    question: `What is (${a} ${op1} ${b}) ${op2} ${c}?`,
    answer,
  };
}

function genConversion(rng) {
  const type = randInt(rng, 0, 4);
  if (type === 0) {
    const km = randInt(rng, 2, 20);
    return { question: `${km} kilometers = how many meters?`, answer: km * 1000 };
  } else if (type === 1) {
    const min = randInt(rng, 2, 10) * 60 + pickFrom(rng, [0, 15, 30, 45]);
    return { question: `${min} minutes = how many seconds?`, answer: min * 60 };
  } else if (type === 2) {
    const days = randInt(rng, 2, 6);
    return { question: `${days} days = how many hours?`, answer: days * 24 };
  } else if (type === 3) {
    const kg = randInt(rng, 2, 15);
    return { question: `${kg} kilograms = how many grams?`, answer: kg * 1000 };
  } else {
    const feet = randInt(rng, 2, 8);
    return { question: `${feet} feet = how many inches?`, answer: feet * 12 };
  }
}

function genMissingNumber(rng) {
  const type = randInt(rng, 0, 8);

  if (type === 0) {
    // ? × a = b
    const a = randInt(rng, 3, 15);
    const answer = randInt(rng, 2, 12);
    return { question: `? × ${a} = ${answer * a}`, answer, note: 'find the missing number' };
  } else if (type === 1) {
    // a × ? + b = c
    const a = randInt(rng, 2, 9);
    const b = randInt(rng, 3, 25);
    const answer = randInt(rng, 2, 12);
    return { question: `${a} × ? + ${b} = ${a * answer + b}`, answer, note: 'find the missing number' };
  } else if (type === 2) {
    // (? + a) × b = c
    const b = randInt(rng, 2, 9);
    const answer = randInt(rng, 2, 14);
    const a = randInt(rng, 1, 10);
    return { question: `(? + ${a}) × ${b} = ${(answer + a) * b}`, answer, note: 'find the missing number' };
  } else if (type === 3) {
    // a - ? × b = c
    const b = randInt(rng, 2, 7);
    const answer = randInt(rng, 2, 9);
    const c = randInt(rng, 2, 20);
    return { question: `${c + answer * b} - ? × ${b} = ${c}`, answer, note: 'find the missing number' };
  } else if (type === 4) {
    // ? ÷ a + b = c
    const a = randInt(rng, 2, 8);
    const answer = randInt(rng, 2, 10) * a; // ensure divisible
    const b = randInt(rng, 2, 15);
    return { question: `? ÷ ${a} + ${b} = ${answer / a + b}`, answer, note: 'find the missing number' };
  } else if (type === 5) {
    // a² + ? = b
    const a = randInt(rng, 3, 10);
    const answer = randInt(rng, 5, 40);
    return { question: `${a}² + ? = ${a * a + answer}`, answer, note: 'find the missing number' };
  } else if (type === 6) {
    // (a - ?) × b = c
    const b = randInt(rng, 2, 7);
    const answer = randInt(rng, 1, 8);
    const a = answer + randInt(rng, 2, 10);
    return { question: `(${a} - ?) × ${b} = ${(a - answer) * b}`, answer, note: 'find the missing number' };
  } else if (type === 7) {
    // a + ? × b = c (two-step)
    const b = randInt(rng, 2, 8);
    const answer = randInt(rng, 2, 10);
    const a = randInt(rng, 5, 30);
    return { question: `${a} + ? × ${b} = ${a + answer * b}`, answer, note: 'find the missing number' };
  } else {
    // ? % of a = b (nice percentages)
    const percents = [10, 20, 25, 50];
    const p = pickFrom(rng, percents);
    const answer = randInt(rng, 2, 20) * (100 / p);
    return { question: `${p}% of ? = ${(p * answer) / 100}`, answer, note: 'find the missing number' };
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
  const type = randInt(rng, 0, 8);

  if (type === 0) {
    // Arithmetic: a, a+d, a+2d, a+3d, ?
    const a = randInt(rng, 1, 25);
    const d = randInt(rng, 2, 12);
    const terms = [a, a + d, a + 2 * d, a + 3 * d];
    return {
      question: `What comes next?\n${terms.join(', ')}, ?`,
      answer: a + 4 * d,
      note: 'complete the sequence',
    };
  } else if (type === 1) {
    // Geometric: a, a*r, a*r², a*r³, ?
    const a = randInt(rng, 1, 5);
    const r = randInt(rng, 2, 4);
    const terms = [a, a * r, a * r ** 2, a * r ** 3];
    return {
      question: `What comes next?\n${terms.join(', ')}, ?`,
      answer: a * r ** 4,
      note: 'complete the sequence',
    };
  } else if (type === 2) {
    // Squares: n², (n+1)², ...
    const n = randInt(rng, 1, 9);
    const terms = [n ** 2, (n + 1) ** 2, (n + 2) ** 2, (n + 3) ** 2];
    return {
      question: `What comes next?\n${terms.join(', ')}, ?`,
      answer: (n + 4) ** 2,
      note: 'complete the sequence',
    };
  } else if (type === 3) {
    // Alternating +d, ×2
    const a = randInt(rng, 2, 8);
    const d = randInt(rng, 3, 7);
    const t1 = a, t2 = a + d, t3 = t2 * 2, t4 = t3 + d;
    return {
      question: `What comes next?\n${t1}, ${t2}, ${t3}, ${t4}, ?`,
      answer: t4 * 2,
      note: 'complete the sequence',
    };
  } else if (type === 4) {
    // Fibonacci-like: a, b, a+b, a+2b, 2a+3b, ?
    const a = randInt(rng, 1, 8);
    const b = randInt(rng, 1, 8);
    const t1 = a, t2 = b, t3 = a + b, t4 = b + t3, t5 = t3 + t4;
    return {
      question: `What comes next?\n${t1}, ${t2}, ${t3}, ${t4}, ?`,
      answer: t5,
      note: 'complete the sequence',
    };
  } else if (type === 5) {
    // Triangular numbers offset: n*(n+1)/2 + offset
    const start = randInt(rng, 1, 5);
    const offset = randInt(rng, 0, 10);
    const tri = (n) => (n * (n + 1)) / 2 + offset;
    const terms = [tri(start), tri(start+1), tri(start+2), tri(start+3)];
    return {
      question: `What comes next?\n${terms.join(', ')}, ?`,
      answer: tri(start + 4),
      note: 'complete the sequence',
    };
  } else if (type === 6) {
    // Alternating subtract/multiply: a, a-d, (a-d)*r, (a-d)*r - d, ?
    const a = randInt(rng, 15, 30);
    const d = randInt(rng, 2, 6);
    const r = randInt(rng, 2, 3);
    const t1 = a, t2 = a - d, t3 = t2 * r, t4 = t3 - d;
    return {
      question: `What comes next?\n${t1}, ${t2}, ${t3}, ${t4}, ?`,
      answer: t4 * r,
      note: 'complete the sequence',
    };
  } else if (type === 7) {
    // Cubes: n³, (n+1)³, ...
    const n = randInt(rng, 1, 5);
    const terms = [n ** 3, (n+1) ** 3, (n+2) ** 3, (n+3) ** 3];
    return {
      question: `What comes next?\n${terms.join(', ')}, ?`,
      answer: (n + 4) ** 3,
      note: 'complete the sequence',
    };
  } else {
    // Arithmetic with negative step
    const a = randInt(rng, 50, 120);
    const d = randInt(rng, 3, 11);
    const terms = [a, a - d, a - 2 * d, a - 3 * d];
    return {
      question: `What comes next?\n${terms.join(', ')}, ?`,
      answer: a - 4 * d,
      note: 'complete the sequence',
    };
  }
}

const WORD_TEMPLATES = [
  {
    gen: (rng) => {
      const rows = randInt(rng, 4, 14);
      const cols = randInt(rng, 4, 14);
      const empty = randInt(rng, 2, rows * cols - 3);
      return {
        question: `A cinema has ${rows} rows of ${cols} seats.\n${empty} seats are empty.\nHow many are occupied?`,
        answer: rows * cols - empty,
      };
    },
  },
  {
    gen: (rng) => {
      const h = randInt(rng, 1, 4);
      const m = randInt(rng, 5, 55);
      return {
        question: `A movie is ${h} hour${h > 1 ? 's' : ''} and ${m} minutes long.\nHow many minutes is that?`,
        answer: h * 60 + m,
      };
    },
  },
  {
    gen: (rng) => {
      const price = randInt(rng, 3, 20);
      const qty = randInt(rng, 3, 12);
      const discount = price * randInt(rng, 1, Math.floor(qty / 2));
      return {
        question: `You buy ${qty} items at $${price} each.\nYou have a $${discount} coupon.\nHow much do you pay?`,
        answer: price * qty - discount,
      };
    },
  },
  {
    gen: (rng) => {
      const start = randInt(rng, 20, 100);
      const give = randInt(rng, 3, start - 5);
      const find = randInt(rng, 2, 30);
      return {
        question: `You have ${start} coins.\nYou give ${give} away, then find ${find} more.\nHow many do you have?`,
        answer: start - give + find,
      };
    },
  },
  {
    gen: (rng) => {
      const workers = randInt(rng, 3, 10);
      const rate = randInt(rng, 4, 15);
      const hours = randInt(rng, 2, 8);
      return {
        question: `${workers} workers each make ${rate} items per hour.\nHow many items in ${hours} hours?`,
        answer: workers * rate * hours,
      };
    },
  },
  {
    gen: (rng) => {
      const total = randInt(rng, 20, 120);
      const fracs = [[1, 2], [1, 4], [1, 5], [1, 3], [2, 5]];
      const valid = fracs.filter(([, d]) => total % d === 0);
      const [num, den] = pickFrom(rng, valid.length ? valid : [[1, 2]]);
      const taken = Math.floor((total * num) / den);
      return {
        question: `There are ${total} students.\n${num}/${den} of them go home early.\nHow many are left?`,
        answer: total - taken,
      };
    },
  },
  {
    gen: (rng) => {
      const speed = randInt(rng, 30, 90);
      const hours = randInt(rng, 1, 5);
      return {
        question: `A car travels at ${speed} mph.\nHow far does it go in ${hours} hour${hours > 1 ? 's' : ''}?`,
        answer: speed * hours,
      };
    },
  },
  {
    gen: (rng) => {
      const packs = randInt(rng, 3, 10);
      const perPack = randInt(rng, 4, 12);
      const eaten = randInt(rng, 2, packs * perPack - 4);
      return {
        question: `You have ${packs} packs of ${perPack} crackers.\nYou eat ${eaten}.\nHow many crackers are left?`,
        answer: packs * perPack - eaten,
      };
    },
  },
  {
    gen: (rng) => {
      const saved = randInt(rng, 20, 200);
      const earn = randInt(rng, 5, 30);
      const weeks = randInt(rng, 2, 8);
      const spend = randInt(rng, 5, saved - 5);
      return {
        question: `You have $${saved} saved.\nYou earn $${earn}/week for ${weeks} weeks,\nthen spend $${spend}.\nHow much do you have?`,
        answer: saved + earn * weeks - spend,
      };
    },
  },
  {
    gen: (rng) => {
      const shelves = randInt(rng, 3, 8);
      const perShelf = randInt(rng, 5, 15);
      const removed = randInt(rng, 2, shelves * perShelf - 5);
      return {
        question: `A library has ${shelves} shelves with ${perShelf} books each.\n${removed} books are checked out.\nHow many remain?`,
        answer: shelves * perShelf - removed,
      };
    },
  },
  {
    gen: (rng) => {
      const adults = randInt(rng, 10, 40);
      const kids = randInt(rng, 5, 25);
      const adultPrice = randInt(rng, 5, 15);
      const kidPrice = randInt(rng, 2, adultPrice - 1);
      return {
        question: `${adults} adults at $${adultPrice} each and ${kids} kids at $${kidPrice} each.\nWhat's the total?`,
        answer: adults * adultPrice + kids * kidPrice,
      };
    },
  },
  {
    gen: (rng) => {
      const length = randInt(rng, 5, 20);
      const width = randInt(rng, 3, 14);
      return {
        question: `A rectangular garden is ${length}m long and ${width}m wide.\nWhat is its area in m²?`,
        answer: length * width,
      };
    },
  },
  {
    gen: (rng) => {
      const total = randInt(rng, 30, 120);
      const groups = randInt(rng, 3, 8);
      // make total divisible
      const actual = groups * randInt(rng, 3, 15);
      const left = randInt(rng, 1, groups - 1);
      return {
        question: `${actual} people are split into ${groups} equal groups.\n${left} group${left > 1 ? 's' : ''} leave${left === 1 ? 's' : ''}.\nHow many people remain?`,
        answer: actual - left * (actual / groups),
      };
    },
  },
  {
    gen: (rng) => {
      const perDay = randInt(rng, 8, 25);
      const days = randInt(rng, 3, 7);
      const bonus = randInt(rng, 10, 50);
      return {
        question: `You read ${perDay} pages/day for ${days} days,\nthen read ${bonus} extra pages on the weekend.\nHow many pages total?`,
        answer: perDay * days + bonus,
      };
    },
  },
  {
    gen: (rng) => {
      const start = randInt(rng, 6, 10);
      const startMin = pickFrom(rng, [0, 15, 30, 45]);
      const durationH = randInt(rng, 1, 3);
      const durationM = pickFrom(rng, [0, 15, 30, 45]);
      const endMin = (startMin + durationM) % 60;
      const carry = startMin + durationM >= 60 ? 1 : 0;
      const endH = start + durationH + carry;
      const fmt = (h, m) => `${h}:${m === 0 ? '00' : m}`;
      return {
        question: `A meeting starts at ${fmt(start, startMin)}.\nIt lasts ${durationH}h ${durationM}m.\nWhat minute does it end on? (just the minute, 0–59)`,
        answer: endMin,
      };
    },
  },
  {
    gen: (rng) => {
      const price = randInt(rng, 10, 50);
      const pct = pickFrom(rng, [10, 20, 25, 50]);
      const discount = Math.floor((price * pct) / 100);
      return {
        question: `An item costs $${price}.\nIt's ${pct}% off.\nHow much do you save?`,
        answer: discount,
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
  genWordProblem,      // weighted heavier
  genConversion,
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

const NEEDED_BY_DIFFICULTY = { easy: 3, medium: 4, hard: 5 };

function ProgressDots({ correct, needed }) {
  return (
    <View style={progStyles.row}>
      {Array.from({ length: needed }, (_, i) => (
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

export default function AnnoyingMathGame({ onComplete, difficulty = 'medium' }) {
  const needed = NEEDED_BY_DIFFICULTY[difficulty] ?? 4;
  const [baseSeed] = useState(() => Date.now());
  const [problemIndex, setProblemIndex] = useState(0);
  const [input, setInput] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [taunt, setTaunt] = useState('');

  const problem = useMemo(
    () => generateProblem(baseSeed + problemIndex * 31337),
    [baseSeed, problemIndex]
  );

  const isWon = correctCount >= needed;

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
        <AppText variant="subheading">🔢 math</AppText>
        <ProgressDots correct={correctCount} needed={needed} />
      </View>
      <AppText variant="caption" style={styles.needed}>
        get {needed - correctCount} more correct
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
