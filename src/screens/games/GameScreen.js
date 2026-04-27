import { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import MilestoneModal from '../../components/MilestoneModal';
import { pickRandomGame } from '../../games/registry';
import {
  checkMilestone,
  getMilestoneMessage,
  TOTAL_MILESTONES,
  APP_MILESTONES,
} from '../../utils/streak';
import {
  getSettings,
  getEvents,
  recordEvent,
} from '../../utils/storage';
import { isInFreeZone } from '../../utils/location';
import { ALL_APPS } from '../../utils/storage';
import { colors, spacing, radius } from '../../theme';

// Game flow states
const STATE = {
  LOADING:   'loading',    // fetching settings + location check
  INTERCEPT: 'intercept',  // One Sec-style loading screen with stats
  FREE_ZONE: 'free_zone',  // user is in a free zone — skip the game
  PLAYING:   'playing',    // game in progress
  DECISION:  'decision',   // game beaten — open anyway or walk away?
  DONE:      'done',       // user made their choice
};

const INTERCEPT_DURATION = 3000; // ms before auto-advancing to game

const INTERCEPT_MESSAGES_LOW = [
  "here we go.",
  "bold choice.",
  "your thumbs are faster than your brain.",
  "you opened the app. the app did not open you. wait.",
];
const INTERCEPT_MESSAGES_MID = [
  "your thumbs got here before your brain did.",
  "your future self is watching.",
  "is this really what you want to be doing?",
  "it'll still be there in 10 minutes.",
];
const INTERCEPT_MESSAGES_HIGH = [
  "okay this is getting concerning.",
  "at what point do we call this a habit?",
  "your phone is not going to put itself down.",
  "you're really doing this again, huh.",
];

function pickInterceptMessage(count24h) {
  if (count24h >= 5) return INTERCEPT_MESSAGES_HIGH[Math.floor(Math.random() * INTERCEPT_MESSAGES_HIGH.length)];
  if (count24h >= 2) return INTERCEPT_MESSAGES_MID[Math.floor(Math.random() * INTERCEPT_MESSAGES_MID.length)];
  return INTERCEPT_MESSAGES_LOW[Math.floor(Math.random() * INTERCEPT_MESSAGES_LOW.length)];
}

function formatTimeAgo(ms) {
  if (ms < 90000)        return 'just now';
  if (ms < 3600000)      return `${Math.floor(ms / 60000)} min ago`;
  if (ms < 86400000)     return `${Math.floor(ms / 3600000)} hr ago`;
  return `${Math.floor(ms / 86400000)}d ago`;
}

export default function GameScreen({ navigation, route }) {
  // App context comes from the deep link URL params:
  //   frictionmaxxing://game?appId=tiktok&label=TikTok
  // Falls back to Instagram for the dev test button in Settings.
  const rawId    = route?.params?.appId ?? 'instagram';
  const rawLabel = route?.params?.label  ?? 'Instagram';
  const appId    = rawId;
  const appLabel = decodeURIComponent(rawLabel);
  const appEmoji = ALL_APPS.find((a) => a.id === appId)?.emoji ?? '📱';

  const [gameState, setGameState] = useState(STATE.LOADING);
  const [selectedGame, setSelectedGame] = useState(null);
  const [difficulty, setDifficulty]     = useState('medium');
  const [milestone, setMilestone] = useState(null);

  // Intercept screen state
  const [count24h, setCount24h]             = useState(0);
  const [lastAttemptMs, setLastAttemptMs]   = useState(null); // ms since last event for this app
  const [interceptMessage, setInterceptMessage] = useState('');
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Track whether a final event has already been recorded this session.
  // If the component unmounts without one, it counts as a rage-quit.
  const eventRecorded = useRef(false);

  // Load settings, check free zone, compute intercept stats, then show intercept screen
  useEffect(() => {
    async function init() {
      const [s, events] = await Promise.all([getSettings(), getEvents()]);

      // If the user is in a saved free zone, skip the game entirely
      if (s.freeZones?.length) {
        const inFreeZone = await isInFreeZone(s.freeZones);
        if (inFreeZone) {
          eventRecorded.current = true; // prevent false rage-quit on unmount
          setGameState(STATE.FREE_ZONE);
          return;
        }
      }

      setDifficulty(s.difficulty ?? 'medium');
      const game = pickRandomGame(s.enabledGames);
      setSelectedGame(game);

      // Compute 24h stats for the intercept screen
      const now = Date.now();
      const cutoff = now - 24 * 60 * 60 * 1000;
      const appEvents = events.filter((e) => e.appId === appId);
      const recent = appEvents.filter((e) => e.timestamp > cutoff);
      const lastEvent = appEvents.sort((a, b) => b.timestamp - a.timestamp)[0];

      setCount24h(recent.length);
      setLastAttemptMs(lastEvent ? now - lastEvent.timestamp : null);
      setInterceptMessage(pickInterceptMessage(recent.length));
      setGameState(STATE.INTERCEPT);
    }
    init();
  }, []);

  // Intercept screen: animate progress bar and auto-advance after INTERCEPT_DURATION
  useEffect(() => {
    if (gameState !== STATE.INTERCEPT) return;

    progressAnim.setValue(0);
    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: INTERCEPT_DURATION,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) setGameState(STATE.PLAYING);
    });

    return () => anim.stop();
  }, [gameState]);

  // Rage-quit detector — fires on unmount if no event was recorded
  useEffect(() => {
    return () => {
      if (!eventRecorded.current) {
        recordEvent({ appId, appLabel, appEmoji, gameCompleted: false, walkedAway: false });
      }
    };
  }, []);

  // User bails out from the intercept screen before the game even starts
  async function handleInterceptWalkAway() {
    eventRecorded.current = true;
    await recordEvent({ appId, appLabel, appEmoji, gameCompleted: false, walkedAway: true });

    const events = await getEvents();
    const newTotal    = events.filter((e) => e.walkedAway).length;
    const newAppCount = events.filter((e) => e.walkedAway && e.appId === appId).length;

    const appHit   = checkMilestone(newAppCount, APP_MILESTONES);
    const totalHit = checkMilestone(newTotal, TOTAL_MILESTONES);

    if (appHit)        setMilestone(getMilestoneMessage(appHit, appLabel));
    else if (totalHit) setMilestone(getMilestoneMessage(totalHit));
    else               navigation.goBack();
  }

  function handleGameComplete() {
    setGameState(STATE.DECISION);
  }

  async function handleWalkAway() {
    eventRecorded.current = true;
    await recordEvent({ appId, appLabel, appEmoji, gameCompleted: true, walkedAway: true });

    const events = await getEvents();
    const newTotal    = events.filter((e) => e.walkedAway).length;
    const newAppCount = events.filter((e) => e.walkedAway && e.appId === appId).length;

    const appHit   = checkMilestone(newAppCount, APP_MILESTONES);
    const totalHit = checkMilestone(newTotal, TOTAL_MILESTONES);

    if (appHit)        setMilestone(getMilestoneMessage(appHit, appLabel));
    else if (totalHit) setMilestone(getMilestoneMessage(totalHit));

    setGameState(STATE.DONE);
  }

  async function handleOpenAnyway() {
    eventRecorded.current = true;
    await recordEvent({ appId, appLabel, appEmoji, gameCompleted: true, walkedAway: false });
    navigation.goBack();
  }

  function handleMilestoneDismiss() {
    setMilestone(null);
    navigation.goBack();
  }

  return (
    <ScreenWrapper style={styles.wrapper}>

      {/* Loading — brief, fetching settings + location check */}
      {gameState === STATE.LOADING && (
        <View style={styles.centered} />
      )}

      {/* Intercept screen — One Sec-style pause before the game */}
      {gameState === STATE.INTERCEPT && (
        <View style={styles.interceptWrapper}>
          {/* App identity */}
          <View style={styles.interceptTop}>
            <AppText style={styles.interceptEmoji}>{appEmoji}</AppText>
            <AppText variant="subheading" style={styles.interceptAppName}>
              {appLabel}
            </AppText>
            <AppText variant="caption" style={styles.interceptSubtitle}>
              loading your friction...
            </AppText>
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange:  [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          {/* Stats */}
          <View style={styles.interceptStats}>
            <View style={styles.statRow}>
              <AppText style={styles.statNumber}>{count24h}</AppText>
              <AppText variant="caption" style={styles.statLabel}>
                {count24h === 1 ? 'attempt' : 'attempts'} in the last 24 hours
              </AppText>
            </View>
            {lastAttemptMs !== null && (
              <View style={styles.statRow}>
                <AppText variant="caption" style={styles.statLast}>
                  last attempt:{' '}
                  <AppText variant="caption" style={styles.statLastHighlight}>
                    {formatTimeAgo(lastAttemptMs)}
                  </AppText>
                </AppText>
              </View>
            )}
          </View>

          {/* Cheeky message */}
          <AppText variant="caption" style={styles.interceptMessage}>
            {interceptMessage}
          </AppText>

          {/* Early exit */}
          <TouchableOpacity
            onPress={handleInterceptWalkAway}
            style={styles.interceptExitBtn}
            activeOpacity={0.6}
          >
            <AppText variant="caption" style={styles.interceptExitText}>
              i don't want to open {appLabel}
            </AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Free zone — user is in a saved location, skip the game */}
      {gameState === STATE.FREE_ZONE && (
        <View style={styles.centered}>
          <AppText variant="xxl" style={styles.winEmoji}>🌍</AppText>
          <AppText variant="xxl" style={styles.decisionTitle}>you're in a free zone.</AppText>
          <AppText variant="caption" style={styles.decisionSub}>
            friction is paused here. enjoy.
          </AppText>
          <View style={styles.decisionButtons}>
            <Button label="got it" variant="primary" onPress={() => navigation.goBack()} />
          </View>
        </View>
      )}

      {/* Playing state */}
      {gameState === STATE.PLAYING && selectedGame && (
        <View style={styles.playing}>
          <View style={styles.gameHeader}>
            <AppText variant="xxl" style={styles.appEmoji}>{appEmoji}</AppText>
            <AppText variant="caption" style={styles.interceptedLabel}>
              really? {appLabel}? okay fine. beat this first.
            </AppText>
          </View>
          <View style={styles.gameArea}>
            <selectedGame.component
              onComplete={handleGameComplete}
              gameLabel={selectedGame.label}
              gameEmoji={selectedGame.emoji}
              difficulty={difficulty}
            />
          </View>
        </View>
      )}

      {/* Decision state — game beaten, now choose */}
      {gameState === STATE.DECISION && (
        <View style={styles.centered}>
          <AppText variant="xxl" style={styles.winEmoji}>🎉</AppText>
          <AppText variant="xxl" style={styles.decisionTitle}>you beat it.</AppText>
          <AppText variant="caption" style={styles.decisionSub}>
            now you get to choose. no judgment. (okay, a little judgment.)
          </AppText>

          <View style={styles.decisionButtons}>
            <Button
              label="walk away 💪"
              variant="primary"
              onPress={handleWalkAway}
            />
            <TouchableOpacity onPress={handleOpenAnyway} style={styles.openAnywayBtn} activeOpacity={0.5}>
              <AppText variant="caption" style={styles.openAnywayText}>
                open {appLabel} anyway
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Done state */}
      {gameState === STATE.DONE && !milestone && (
        <View style={styles.centered}>
          <AppText variant="xxl">🧘</AppText>
          <AppText variant="subheading" style={styles.doneText}>good call.</AppText>
        </View>
      )}

      {/* Milestone modal */}
      <MilestoneModal
        visible={!!milestone}
        message={milestone}
        onDismiss={handleMilestoneDismiss}
      />

    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  playing: {
    flex: 1,
  },
  gameHeader: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  appEmoji: {
    fontSize: 56,
  },
  interceptedLabel: {
    textAlign: 'center',
    lineHeight: 20,
  },
  gameArea: {
    flex: 1,
  },
  winEmoji: {
    fontSize: 56,
  },
  decisionTitle: {
    color: colors.text,
  },
  decisionSub: {
    textAlign: 'center',
    lineHeight: 20,
  },
  decisionButtons: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  openAnywayBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  openAnywayText: {
    color: colors.textDisabled,
  },
  doneText: {
    color: colors.textSub,
  },

  // ── Intercept screen ──────────────────────────────────────────────────────────
  interceptWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  interceptTop: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  interceptEmoji: {
    fontSize: 64,
    lineHeight: 72,
  },
  interceptAppName: {
    color: colors.text,
    textAlign: 'center',
  },
  interceptSubtitle: {
    color: colors.textSub,
    textAlign: 'center',
    letterSpacing: 1,
  },
  progressTrack: {
    width: '100%',
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
  interceptStats: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  statRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  statNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 52,
  },
  statLabel: {
    color: colors.textSub,
    textAlign: 'center',
  },
  statLast: {
    color: colors.textSub,
    textAlign: 'center',
  },
  statLastHighlight: {
    color: colors.text,
  },
  interceptMessage: {
    color: colors.textSub,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: spacing.md,
  },
  interceptExitBtn: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  interceptExitText: {
    color: colors.textDisabled,
    textDecorationLine: 'underline',
  },
});
