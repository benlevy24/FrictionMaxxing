import { useState, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import AppText from '../components/AppText';
import Button from '../components/Button';
import { colors, spacing, radius } from '../theme';

// ── Word bank ─────────────────────────────────────────────────────────────────
// 75 words — obscure enough that you won't just cruise through them.
// Hint is a short clue shown during the game.

const WORDS = [
  { word: 'PETRICHOR',       hint: 'that smell after it rains' },
  { word: 'LIMERENCE',       hint: 'obsessive romantic attraction' },
  { word: 'SUSURRUS',        hint: 'a soft whispering or murmuring' },
  { word: 'EPHEMERAL',       hint: 'lasts only a very short time' },
  { word: 'MELLIFLUOUS',     hint: 'pleasantly smooth and musical' },
  { word: 'QUIXOTIC',        hint: 'idealistic and impractical' },
  { word: 'SOLIPSISM',       hint: 'only your own mind is real' },
  { word: 'LIMINAL',         hint: 'relating to a threshold or transition' },
  { word: 'INEFFABLE',       hint: 'too great to be expressed in words' },
  { word: 'CREPUSCULAR',     hint: 'active at dawn or dusk' },
  { word: 'SONDER',          hint: 'realising strangers have full lives too' },
  { word: 'NUMINOUS',        hint: 'having a strong spiritual quality' },
  { word: 'BORBORYGMUS',     hint: 'stomach rumbling sound' },
  { word: 'DEFENESTRATION',  hint: 'throwing someone out a window' },
  { word: 'TERGIVERSATION',  hint: 'evasion and equivocation' },
  { word: 'CALLIPYGIAN',     hint: 'having well-shaped buttocks' },
  { word: 'SNOLLYGOSTER',    hint: 'shrewd unprincipled politician' },
  { word: 'FLIBBERTIGIBBET', hint: 'a flighty talkative person' },
  { word: 'BLOVIATE',        hint: 'talk at length with little substance' },
  { word: 'DISCOMBOBULATE',  hint: 'confuse and disconcert' },
  { word: 'CATTYWAMPUS',     hint: 'diagonal or crooked' },
  { word: 'BUMFUZZLE',       hint: 'to confuse or bewilder' },
  { word: 'HORNSWOGGLE',     hint: 'to cheat or swindle' },
  { word: 'TARADIDDLE',      hint: 'a petty lie or fib' },
  { word: 'COLLYWOBBLES',    hint: 'stomach butterflies or anxiety' },
  { word: 'KERFUFFLE',       hint: 'a commotion caused by disagreement' },
  { word: 'CODSWALLOP',      hint: 'complete nonsense' },
  { word: 'BALDERDASH',      hint: 'senseless talk or writing' },
  { word: 'FLAPDOODLE',      hint: 'nonsense, foolish talk' },
  { word: 'RAPSCALLION',     hint: 'a mischievous rascal' },
  { word: 'SCOFFLAW',        hint: 'person who flouts the law' },
  { word: 'JACKANAPES',      hint: 'an impertinent person' },
  { word: 'WHIPPERSNAPPER',  hint: 'a young overconfident person' },
  { word: 'CURMUDGEON',      hint: 'bad-tempered grumpy person' },
  { word: 'NINCOMPOOP',      hint: 'a foolish person' },
  { word: 'MOLLYCODDLE',     hint: 'to pamper excessively' },
  { word: 'PERSPICACIOUS',   hint: 'having sharp judgement' },
  { word: 'OBSEQUIOUS',      hint: 'excessively eager to please' },
  { word: 'LOQUACIOUS',      hint: 'tends to talk a lot' },
  { word: 'PERFIDIOUS',      hint: 'treacherous and deceitful' },
  { word: 'LUGUBRIOUS',      hint: 'looking or sounding mournful' },
  { word: 'PUSILLANIMOUS',   hint: 'lacking courage; timid' },
  { word: 'VITUPERATIVE',    hint: 'bitter and abusive' },
  { word: 'TENDENTIOUS',     hint: 'promoting a point of view' },
  { word: 'RECONDITE',       hint: 'obscure and known by few' },
  { word: 'TRUCULENT',       hint: 'eager to argue or fight' },
  { word: 'SANGUINE',        hint: 'optimistic even in dire situations' },
  { word: 'INSOUCIANCE',     hint: 'casual indifference' },
  { word: 'APOCRYPHAL',      hint: 'of doubtful authenticity' },
  { word: 'CALUMNY',         hint: 'making false statements to damage reputation' },
  { word: 'TINTINNABULATION',hint: 'ringing or tinkling of bells' },
  { word: 'SESQUIPEDALIAN',  hint: 'ironically, a word meaning long words' },
  { word: 'QUIDDITY',        hint: 'the inherent nature of something' },
  { word: 'VICISSITUDE',     hint: 'a change of circumstance' },
  { word: 'ZUGZWANG',        hint: 'forced to make a damaging move' },
  { word: 'SCHADENFREUDE',   hint: 'pleasure from others\' misfortune' },
  { word: 'WELTANSCHAUUNG',  hint: 'a particular philosophy of life' },
  { word: 'HIRAETH',         hint: 'Welsh: longing for a lost home' },
  { word: 'SAUDADE',         hint: 'deep longing for something absent' },
  { word: 'ATAVISTIC',       hint: 'reverting to ancestral behaviour' },
  { word: 'LABYRINTHINE',    hint: 'like a labyrinth; complicated' },
  { word: 'CHIMERICAL',      hint: 'wildly unrealistic or fanciful' },
  { word: 'MERCURIAL',       hint: 'subject to sudden mood changes' },
  { word: 'SISYPHEAN',       hint: 'endless and ultimately futile task' },
  { word: 'KAFKAESQUE',      hint: 'surreal and bureaucratically oppressive' },
  { word: 'MACHIAVELLIAN',   hint: 'cunning and unscrupulous' },
  { word: 'PYRRHIC',         hint: 'victory won at too great a cost' },
  { word: 'PROMETHEAN',      hint: 'boldly creative; life-giving' },
  { word: 'LACONIC',         hint: 'using very few words' },
  { word: 'FAUSTIAN',        hint: 'trading something moral for gain' },
  { word: 'DRACONIAN',       hint: 'excessively harsh or severe' },
  { word: 'BYZANTINE',       hint: 'excessively complicated' },
  { word: 'SEMPITERNAL',     hint: 'eternal and unchanging' },
  { word: 'NOCTILUCENT',     hint: 'glowing at night (clouds)' },
  { word: 'VELLICHOR',       hint: 'strange wistfulness in a used bookstore' },
];

const MAX_WRONG = 6;

// ── Seeded pick ───────────────────────────────────────────────────────────────

function pickWord(seed, usedIndices) {
  let s = seed >>> 0;
  function next() {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  }
  const available = WORDS.map((_, i) => i).filter((i) => !usedIndices.has(i));
  const pool = available.length > 0 ? available : WORDS.map((_, i) => i);
  return pool[Math.floor(next() * pool.length)];
}

// ── Hangman drawing helpers ───────────────────────────────────────────────────
// All drawing done with absolutely-positioned Views inside a fixed container.

function lineStyle(x1, y1, x2, y2, thickness = 2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dx, dy) * 180) / Math.PI;
  return {
    position: 'absolute',
    width: thickness,
    height: length,
    backgroundColor: colors.textSub,
    left: (x1 + x2) / 2 - thickness / 2,
    top: (y1 + y2) / 2 - length / 2,
    transform: [{ rotate: `${angle}deg` }],
  };
}

const W = 160; // canvas width
const H = 155; // canvas height

// Gallows coordinates
const BASE_Y = H - 4;
const POST_X = 28;
const BEAM_X2 = 112;
const BEAM_Y = 8;
const ROPE_END_Y = 30;
const FIG_X = 112; // figure horizontal center

// Body part endpoints
const HEAD_CY = 43;
const HEAD_R = 13;
const BODY_TOP_Y = HEAD_CY + HEAD_R;
const BODY_BOT_Y = BODY_TOP_Y + 44;
const ARM_Y = BODY_TOP_Y + 12;
const LEG_Y = BODY_BOT_Y;

const BODY_PARTS = [
  // 0: Head
  { type: 'circle', cx: FIG_X, cy: HEAD_CY, r: HEAD_R },
  // 1: Body
  { type: 'line', x1: FIG_X, y1: BODY_TOP_Y, x2: FIG_X, y2: BODY_BOT_Y },
  // 2: Left arm
  { type: 'line', x1: FIG_X, y1: ARM_Y, x2: FIG_X - 24, y2: ARM_Y + 22 },
  // 3: Right arm
  { type: 'line', x1: FIG_X, y1: ARM_Y, x2: FIG_X + 24, y2: ARM_Y + 22 },
  // 4: Left leg
  { type: 'line', x1: FIG_X, y1: LEG_Y, x2: FIG_X - 22, y2: LEG_Y + 28 },
  // 5: Right leg
  { type: 'line', x1: FIG_X, y1: LEG_Y, x2: FIG_X + 22, y2: LEG_Y + 28 },
];

function HangmanDrawing({ wrongCount }) {
  return (
    <View style={{ width: W, height: H }}>
      {/* Static gallows */}
      <View style={lineStyle(POST_X, BEAM_Y, POST_X, BASE_Y)} />
      <View style={lineStyle(POST_X, BEAM_Y, BEAM_X2, BEAM_Y)} />
      <View style={lineStyle(0, BASE_Y, W * 0.75, BASE_Y, 3)} />
      <View style={lineStyle(BEAM_X2, BEAM_Y, BEAM_X2, ROPE_END_Y)} />

      {/* Body parts revealed by wrong count */}
      {BODY_PARTS.slice(0, wrongCount).map((part, i) =>
        part.type === 'circle' ? (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: part.r * 2,
              height: part.r * 2,
              borderRadius: part.r,
              borderWidth: 2,
              borderColor: colors.textSub,
              left: part.cx - part.r,
              top: part.cy - part.r,
            }}
          />
        ) : (
          <View key={i} style={lineStyle(part.x1, part.y1, part.x2, part.y2)} />
        )
      )}
    </View>
  );
}

// ── Keyboard ──────────────────────────────────────────────────────────────────

const ROWS_KEYS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
];

function Keyboard({ guessed, onPress, disabled }) {
  return (
    <View style={kbStyles.container}>
      {ROWS_KEYS.map((row, ri) => (
        <View key={ri} style={kbStyles.row}>
          {row.map((letter) => {
            const isGuessed = guessed.has(letter);
            return (
              <TouchableOpacity
                key={letter}
                style={[kbStyles.key, isGuessed && kbStyles.keyUsed]}
                onPress={() => onPress(letter)}
                disabled={isGuessed || disabled}
                activeOpacity={0.6}
              >
                <AppText
                  style={[kbStyles.keyText, isGuessed && kbStyles.keyTextUsed]}
                >
                  {letter}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const kbStyles = StyleSheet.create({
  container: { gap: 5, alignItems: 'center' },
  row: { flexDirection: 'row', gap: 4 },
  key: {
    width: 30,
    height: 36,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyUsed: {
    backgroundColor: colors.bg,
    borderColor: colors.bg,
  },
  keyText: {
    fontFamily: 'Comic Sans MS',
    fontSize: 13,
    color: colors.text,
  },
  keyTextUsed: {
    color: colors.textDisabled,
  },
});

// ── Taunts ────────────────────────────────────────────────────────────────────

const WRONG_TAUNTS = [
  'not in there.',
  'nope.',
  'bold choice. wrong.',
  'interesting guess. incorrect.',
  'not even close.',
  'yikes.',
];

const CLOSE_CALL_TAUNTS = [
  'one more wrong and you\'re done.',
  'last chance.',
  'this is bad.',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ObscureHangmanGame({ onComplete }) {
  const [baseSeed] = useState(() => Date.now());
  const [usedIndices, setUsedIndices] = useState(new Set());
  const [attemptCount, setAttemptCount] = useState(0);
  const [guessed, setGuessed] = useState(new Set());
  const [taunt, setTaunt] = useState('');

  const wordIndex = useMemo(
    () => pickWord(baseSeed + attemptCount * 13337, usedIndices),
    [baseSeed, attemptCount, usedIndices]
  );
  const { word, hint } = WORDS[wordIndex];

  // Derived state
  const letters = new Set(word.split(''));
  const wrongGuesses = [...guessed].filter((l) => !letters.has(l));
  const wrongCount = wrongGuesses.length;
  const isWon = word.split('').every((l) => guessed.has(l));
  const isLost = wrongCount >= MAX_WRONG;
  const isOver = isWon || isLost;

  function handleGuess(letter) {
    if (isOver || guessed.has(letter)) return;
    const next = new Set(guessed);
    next.add(letter);
    setGuessed(next);

    if (!letters.has(letter)) {
      const newWrong = wrongCount + 1;
      if (newWrong === MAX_WRONG - 1) {
        setTaunt(pick(CLOSE_CALL_TAUNTS));
      } else {
        setTaunt(pick(WRONG_TAUNTS));
      }
    } else {
      setTaunt('');
    }
  }

  function handleRetry() {
    setUsedIndices((prev) => new Set([...prev, wordIndex]));
    setAttemptCount((n) => n + 1);
    setGuessed(new Set());
    setTaunt('');
  }

  // Word display: show guessed letters, hide the rest as _
  const displayWord = word.split('').map((l, i) => (
    <View key={i} style={styles.letterBox}>
      <AppText style={styles.letterText}>
        {guessed.has(l) || isLost ? l : ' '}
      </AppText>
      <View style={styles.letterUnderline} />
    </View>
  ));

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <AppText variant="subheading" style={styles.title}>
        🪢 obscure hangman
      </AppText>

      <View style={styles.gameRow}>
        {/* Hangman drawing */}
        <HangmanDrawing wrongCount={wrongCount} />

        {/* Hint + wrong letters */}
        <View style={styles.sidePanel}>
          <AppText variant="caption" style={styles.hintLabel}>hint:</AppText>
          <AppText variant="caption" style={styles.hintText}>{hint}</AppText>

          <AppText variant="caption" style={[styles.hintLabel, { marginTop: spacing.md }]}>
            wrong ({wrongCount}/{MAX_WRONG}):
          </AppText>
          <AppText style={styles.wrongLetters}>
            {wrongGuesses.join('  ') || '—'}
          </AppText>

          {taunt ? (
            <AppText variant="caption" style={styles.taunt}>{taunt}</AppText>
          ) : null}
        </View>
      </View>

      {/* Word blanks */}
      <View style={styles.wordRow}>{displayWord}</View>

      {/* Result or keyboard */}
      {isWon && (
        <View style={styles.resultBlock}>
          <AppText variant="caption" style={styles.resultText}>
            somehow you got it.
          </AppText>
          <Button label="continue" variant="primary" onPress={onComplete} />
        </View>
      )}

      {isLost && (
        <View style={styles.resultBlock}>
          <AppText variant="caption" style={styles.resultText}>
            it was {word.toLowerCase()}. of course it was.
          </AppText>
          <View style={styles.lostButtons}>
            <Button label="try a new word" variant="secondary" onPress={handleRetry} />
            <Button label="just let me through" variant="ghost" onPress={onComplete} />
          </View>
        </View>
      )}

      {!isOver && (
        <Keyboard guessed={guessed} onPress={handleGuess} disabled={isOver} />
      )}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  title: {
    textAlign: 'center',
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  sidePanel: {
    flex: 1,
    paddingTop: spacing.sm,
    gap: 4,
  },
  hintLabel: {
    color: colors.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  hintText: {
    color: colors.textSub,
    lineHeight: 18,
  },
  wrongLetters: {
    fontFamily: 'Comic Sans MS',
    fontSize: 14,
    color: colors.danger,
    letterSpacing: 2,
    minHeight: 20,
  },
  taunt: {
    color: colors.textSub,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  wordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  letterBox: {
    alignItems: 'center',
    minWidth: 22,
  },
  letterText: {
    fontFamily: 'Comic Sans MS',
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
  },
  letterUnderline: {
    height: 2,
    width: '100%',
    minWidth: 18,
    backgroundColor: colors.border,
    marginTop: 2,
  },
  resultBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  resultText: {
    color: colors.textSub,
    textAlign: 'center',
  },
  lostButtons: {
    width: '100%',
    gap: spacing.sm,
  },
});
