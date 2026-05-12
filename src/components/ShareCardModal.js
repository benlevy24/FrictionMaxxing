import { Modal, View, TouchableOpacity, StyleSheet, Share } from 'react-native';
import AppText from './AppText';
import { colors, spacing, radius } from '../theme';

// Card uses the icon's crimson palette to feel like a branded export,
// distinct from the app's normal dark/orange UI.
const CARD = {
  bg:        '#1A0505',
  surface:   '#2A0A0A',
  accent:    '#EF4444',
  accentMuted: '#3D0F0F',
  text:      '#F2F2F2',
  textSub:   '#A08080',
  textDim:   '#6A4A4A',
  border:    '#3D1A1A',
};

export default function ShareCardModal({ visible, onClose, stats, weekly }) {
  if (!stats) return null;

  const {
    streakCurrent,
    streakBest,
    intercepted,
    walkedAway,
    openedAnyway,
    rageQuit,
    daysSinceInstall,
  } = stats;

  const successRate = intercepted > 0
    ? Math.round(((walkedAway + rageQuit) / intercepted) * 100)
    : 0;

  const maxIntercepted = Math.max(...(weekly ?? []).map((d) => d.intercepted), 1);

  async function handleTextShare() {
    const rate = successRate;
    const message =
      `day ${daysSinceInstall} of needing a maze to stop doomscrolling.\n\n` +
      `🚧 ${intercepted} intercepts\n` +
      `🚶 ${walkedAway} walked away\n` +
      `🏳️ ${rageQuit} rage-quits (the games are genuinely unfair)\n` +
      `🧐 ${openedAnyway} opened anyway (i'm only human)\n\n` +
      `${rate}% friction success rate. ` +
      `${streakCurrent > 0 ? `${streakCurrent} day streak.` : `streak: none. keep trying.`}\n\n` +
      `yes i downloaded an app that gives me annoying games before i can doomscroll.\n` +
      `no i'm not okay. get it at frictionmaxxing.app`;
    try { await Share.share({ message }); } catch { /* cancelled */ }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>

        {/* Card */}
        <View style={styles.card}>

          {/* Wordmark */}
          <View style={styles.wordmarkRow}>
            <View style={styles.wordmarkDot} />
            <AppText style={styles.wordmark}>frictionmaxxing</AppText>
          </View>

          {/* Streak hero */}
          <View style={styles.heroSection}>
            <AppText style={styles.heroEmoji}>
              {streakCurrent > 0 ? '🔥' : '✨'}
            </AppText>
            <AppText style={styles.heroNumber}>{streakCurrent}</AppText>
            <AppText style={styles.heroLabel}>
              day streak
            </AppText>
            {streakBest > 0 && (
              <AppText style={styles.heroBest}>best: {streakBest} days 🏆</AppText>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* 4-stat grid */}
          <View style={styles.statGrid}>
            <StatCell emoji="🚧" value={intercepted}  label="intercepted" />
            <StatCell emoji="🚶" value={walkedAway}   label="walked away" />
            <StatCell emoji="🧐" value={openedAnyway} label="opened anyway" />
            <StatCell emoji="🏳️" value={rageQuit}    label="rage-quit" />
          </View>

          {/* Success rate */}
          <View style={styles.rateSection}>
            <View style={styles.rateHeader}>
              <AppText style={styles.rateLabel}>friction success rate</AppText>
              <AppText style={styles.rateValue}>{successRate}%</AppText>
            </View>
            <View style={styles.rateTrack}>
              <View style={[styles.rateFill, { width: `${successRate}%` }]} />
            </View>
          </View>

          {/* Mini 7-day chart */}
          {weekly && weekly.length > 0 && (
            <View style={styles.chartSection}>
              <AppText style={styles.chartLabel}>last 7 days</AppText>
              <View style={styles.miniChart}>
                {weekly.map((d) => {
                  const barH = Math.max(Math.round((d.intercepted / maxIntercepted) * 40), 2);
                  const fillH = d.intercepted > 0
                    ? Math.max(Math.round((d.succeeded / d.intercepted) * barH), 0)
                    : 0;
                  return (
                    <View key={d.date} style={styles.miniBarCol}>
                      <View style={[styles.miniBarBg, { height: barH }]}>
                        <View style={[styles.miniBarFill, { height: fillH }]} />
                      </View>
                      <AppText style={styles.miniBarLabel}>{d.day[0]}</AppText>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Tagline + branding */}
          <View style={styles.footer}>
            <AppText style={styles.tagline}>
              day {daysSinceInstall} of needing a game{'\n'}to stop doomscrolling
            </AppText>
            <AppText style={styles.footerUrl}>frictionmaxxing.app</AppText>
          </View>

        </View>

        {/* Screenshot hint */}
        <AppText style={styles.hint}>screenshot to save & share</AppText>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.textShareBtn} onPress={handleTextShare}>
            <AppText style={styles.textShareLabel}>share as text instead</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <AppText style={styles.closeBtnLabel}>close</AppText>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

function StatCell({ emoji, value, label }) {
  return (
    <View style={styles.statCell}>
      <AppText style={styles.statEmoji}>{emoji}</AppText>
      <AppText style={styles.statValue}>{value}</AppText>
      <AppText style={styles.statLabel}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },

  // ── Card ────────────────────────────────────────────────────────────────────
  card: {
    width: '100%',
    backgroundColor: CARD.bg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: CARD.border,
    padding: spacing.xl,
    gap: spacing.lg,
  },

  // Wordmark
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  wordmarkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CARD.accent,
  },
  wordmark: {
    fontFamily: 'Comic Sans MS',
    fontSize: 12,
    color: CARD.textSub,
    letterSpacing: 1,
  },

  // Streak hero
  heroSection: {
    alignItems: 'center',
    gap: 4,
  },
  heroEmoji: {
    fontSize: 40,
    lineHeight: 48,
  },
  heroNumber: {
    fontFamily: 'Comic Sans MS',
    fontSize: 72,
    color: CARD.accent,
    lineHeight: 76,
  },
  heroLabel: {
    fontFamily: 'Comic Sans MS',
    fontSize: 16,
    color: CARD.text,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroBest: {
    fontFamily: 'Comic Sans MS',
    fontSize: 12,
    color: CARD.textSub,
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: CARD.border,
  },

  // Stat grid
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCell: {
    width: '47%',
    backgroundColor: CARD.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 2,
    borderWidth: 1,
    borderColor: CARD.border,
  },
  statEmoji: { fontSize: 16 },
  statValue: {
    fontFamily: 'Comic Sans MS',
    fontSize: 28,
    color: CARD.text,
    lineHeight: 32,
  },
  statLabel: {
    fontFamily: 'Comic Sans MS',
    fontSize: 11,
    color: CARD.textSub,
  },

  // Success rate
  rateSection: { gap: spacing.xs },
  rateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  rateLabel: {
    fontFamily: 'Comic Sans MS',
    fontSize: 11,
    color: CARD.textSub,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rateValue: {
    fontFamily: 'Comic Sans MS',
    fontSize: 16,
    color: CARD.accent,
  },
  rateTrack: {
    height: 4,
    backgroundColor: CARD.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  rateFill: {
    height: '100%',
    backgroundColor: CARD.accent,
    borderRadius: 2,
  },

  // Mini chart
  chartSection: { gap: spacing.sm },
  chartLabel: {
    fontFamily: 'Comic Sans MS',
    fontSize: 11,
    color: CARD.textSub,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 52,
  },
  miniBarCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
  },
  miniBarBg: {
    width: 14,
    backgroundColor: CARD.border,
    borderRadius: 2,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  miniBarFill: {
    width: '100%',
    backgroundColor: CARD.accent,
    borderRadius: 2,
  },
  miniBarLabel: {
    fontFamily: 'Comic Sans MS',
    fontSize: 9,
    color: CARD.textDim,
  },

  // Footer
  footer: { gap: 4, alignItems: 'center' },
  tagline: {
    fontFamily: 'Comic Sans MS',
    fontSize: 13,
    color: CARD.textSub,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  footerUrl: {
    fontFamily: 'Comic Sans MS',
    fontSize: 11,
    color: CARD.accent,
    letterSpacing: 1,
  },

  // ── Outside card ────────────────────────────────────────────────────────────
  hint: {
    fontFamily: 'Comic Sans MS',
    fontSize: 12,
    color: colors.textDisabled,
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  textShareBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  textShareLabel: {
    fontFamily: 'Comic Sans MS',
    fontSize: 13,
    color: colors.textSub,
  },
  closeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  closeBtnLabel: {
    fontFamily: 'Comic Sans MS',
    fontSize: 13,
    color: colors.text,
  },
});
