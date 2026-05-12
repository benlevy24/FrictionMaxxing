import { useState, useEffect, useRef } from 'react';
import { View, TextInput, ScrollView, StyleSheet } from 'react-native';
import AppText from '../components/AppText';
import { colors, spacing, radius } from '../theme';

// ── Challenge pool ────────────────────────────────────────────────────────────

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';

function randomString(length, charset = 'lower') {
  let chars = LOWER;
  if (charset === 'mixed') chars = LOWER + UPPER + DIGITS;
  if (charset === 'upper') chars = UPPER + DIGITS;
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const CHALLENGES = {
  easy: [
    { text: () => 'abcdefghijklmnopqrstuvwxyz',         label: 'the alphabet. you\'ve done this before.' },
    { text: () => '1 2 3 4 5 6 7 8 9 10',               label: 'one to ten. with spaces.' },
    { text: () => randomString(18, 'lower'),             label: '18 random characters. no peeking.' },
    { text: () => 'doomscrolling',                       label: 'spell your problem.' },
    { text: () => 'put the phone down',                  label: 'a friendly suggestion.' },
  ],
  medium: [
    { text: () => 'zyxwvutsrqponmlkjihgfedcba',         label: 'the alphabet. backwards.' },
    { text: () => 'one two three four five six seven eight nine ten', label: 'one through ten. spelled out.' },
    { text: () => randomString(35, 'mixed'),             label: '35 mixed characters. enjoy.' },
    { text: () => 'she sells seashells by the seashore', label: 'a tongue twister. classic.' },
    { text: () => 'the quick brown fox jumps over the lazy dog', label: 'a pangram. all 26 letters.' },
  ],
  hard: [
    { text: () => 'abcdefghijklmnopqrstuvwxyz zyxwvutsrqponmlkjihgfedcba', label: 'alphabet. then backwards. no breaks.' },
    { text: () => randomString(60, 'mixed'),             label: '60 mixed characters. we\'re not sorry.' },
    { text: () => 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen', label: 'one through fifteen. spelled out. all of them.' },
    { text: () => 'the quick brown fox jumps over the lazy dog and the dog was too busy on instagram to notice', label: 'a custom pangram. stay with it.' },
    { text: () => randomString(45, 'upper'),             label: '45 uppercase characters and digits. good luck.' },
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function GwamGrowerGame({ onComplete, difficulty }) {
  const [challenge, setChallenge] = useState(null);
  const [typed, setTyped]         = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const pool   = CHALLENGES[difficulty] ?? CHALLENGES.medium;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    setChallenge({ label: picked.label, text: picked.text() });
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  function handleChange(value) {
    if (!challenge) return;
    // Clamp to target length
    const clamped = value.slice(0, challenge.text.length);
    setTyped(clamped);
    if (clamped === challenge.text) onComplete();
  }

  if (!challenge) return null;

  const chars = challenge.text.split('');
  const errorCount = typed.split('').filter((c, i) => c !== chars[i]).length;

  return (
    <View style={styles.container}>
      <AppText variant="caption" style={styles.label}>{challenge.label}</AppText>

      {/* Character-by-character display */}
      <ScrollView
        style={styles.targetScroll}
        contentContainerStyle={styles.targetContent}
        scrollEnabled={false}
      >
        <View style={styles.charRow}>
          {chars.map((char, i) => {
            const typedChar = typed[i];
            const isTyped   = i < typed.length;
            const isCorrect = typedChar === char;
            const color = !isTyped
              ? colors.textDisabled
              : isCorrect
                ? colors.primary
                : colors.danger;
            return (
              <AppText key={i} style={[styles.char, { color }]}>
                {char === ' ' ? '·' : char}
              </AppText>
            );
          })}
        </View>
      </ScrollView>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(typed.length / chars.length) * 100}%` }]} />
      </View>

      {/* Error count */}
      {errorCount > 0 && (
        <AppText variant="caption" style={styles.errorNote}>
          {errorCount} {errorCount === 1 ? 'mistake' : 'mistakes'} — fix them to finish
        </AppText>
      )}

      {/* Hidden input — captures keystrokes, keyboard stays up */}
      <TextInput
        ref={inputRef}
        value={typed}
        onChangeText={handleChange}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        style={styles.input}
        multiline={false}
        blurOnSubmit={false}
      />

      {/* Tap to focus if keyboard dismissed */}
      <AppText
        variant="caption"
        style={styles.tapHint}
        onPress={() => inputRef.current?.focus()}
      >
        tap here if keyboard disappears
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
    justifyContent: 'center',
  },

  label: {
    color: colors.textSub,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },

  targetScroll: {
    maxHeight: 200,
  },
  targetContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  charRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    justifyContent: 'center',
  },
  char: {
    fontFamily: 'monospace',
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: 1,
  },

  progressTrack: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },

  errorNote: {
    color: colors.danger,
    textAlign: 'center',
  },

  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontFamily: 'monospace',
    fontSize: 15,
    marginTop: spacing.sm,
  },

  tapHint: {
    color: colors.textDisabled,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
