import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
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
import { colors, spacing } from '../../theme';

// Game flow states
const STATE = {
  LOADING:   'loading',    // fetching settings + location check
  FREE_ZONE: 'free_zone',  // user is in a free zone — skip the game
  PLAYING:   'playing',    // game in progress
  DECISION:  'decision',   // game beaten — open anyway or walk away?
  DONE:      'done',       // user made their choice
};

// Mock interception context — replaced by Screen Time extension in task #22
const MOCK_INTERCEPTION = {
  appId:    'instagram',
  appLabel: 'Instagram',
  appEmoji: '📸',
};

export default function GameScreen({ navigation }) {
  const [gameState, setGameState] = useState(STATE.LOADING);
  const [selectedGame, setSelectedGame] = useState(null);
  const [difficulty, setDifficulty]     = useState('medium');
  const [milestone, setMilestone] = useState(null);

  const { appId, appLabel, appEmoji } = MOCK_INTERCEPTION;

  // Track whether a final event has already been recorded this session.
  // If the component unmounts without one, it counts as a rage-quit.
  const eventRecorded = useRef(false);

  // Load settings, check free zone, then pick a game
  useEffect(() => {
    async function init() {
      const s = await getSettings();

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
      setGameState(STATE.PLAYING);
    }
    init();
  }, []);

  // Rage-quit detector — fires on unmount if no event was recorded
  useEffect(() => {
    return () => {
      if (!eventRecorded.current) {
        recordEvent({ appId, appLabel, appEmoji, gameCompleted: false, walkedAway: false });
      }
    };
  }, []);

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
    // TODO (task #22): dismiss Screen Time overlay
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

      {/* Free zone — user is in a saved location, skip the game */}
      {gameState === STATE.FREE_ZONE && (
        <View style={styles.centered}>
          <AppText variant="xxl" style={styles.winEmoji}>🌍</AppText>
          <AppText variant="xxl" style={styles.decisionTitle}>you're in a free zone.</AppText>
          <AppText variant="caption" style={styles.decisionSub}>
            blocking is paused here. enjoy.
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
              label={`open ${appLabel} anyway`}
              variant="secondary"
              onPress={handleOpenAnyway}
            />
            <Button
              label="walk away 💪"
              variant="primary"
              onPress={handleWalkAway}
            />
            <AppText variant="caption" style={styles.decisionHint}>
              walking away logs a win. just saying.
            </AppText>
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
  decisionHint: {
    textAlign: 'center',
    color: colors.textDisabled,
    marginTop: spacing.xs,
  },
  doneText: {
    color: colors.textSub,
  },
});
