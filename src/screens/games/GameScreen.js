import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import Card from '../../components/Card';
import MilestoneModal from '../../components/MilestoneModal';
import {
  checkMilestone,
  getMilestoneMessage,
  TOTAL_MILESTONES,
  APP_MILESTONES,
} from '../../utils/streak';
import { colors, spacing } from '../../theme';

// Game flow states
const STATE = {
  PLAYING: 'playing',       // game in progress
  DECISION: 'decision',     // game beaten — open anyway or walk away?
  DONE: 'done',             // user made their choice
};

// Mock interception context — in production this comes from the Screen Time extension (task #22)
const MOCK_INTERCEPTION = {
  appId: 'instagram',
  appLabel: 'Instagram',
  appEmoji: '📸',
};

// Mock walk-away counts — will come from AsyncStorage in task #16
const MOCK_WALK_AWAY_TOTAL = 4;
const MOCK_WALK_AWAY_APP = 1;

export default function GameScreen({ navigation }) {
  const [gameState, setGameState] = useState(STATE.PLAYING);
  const [milestone, setMilestone] = useState(null);

  const { appLabel, appEmoji } = MOCK_INTERCEPTION;

  function handleGameComplete() {
    setGameState(STATE.DECISION);
  }

  function handleWalkAway() {
    // TODO (task #16): persist walk-away counts to AsyncStorage
    const newTotal = MOCK_WALK_AWAY_TOTAL + 1;
    const newAppCount = MOCK_WALK_AWAY_APP + 1;

    const totalHit = checkMilestone(newTotal, TOTAL_MILESTONES);
    const appHit = checkMilestone(newAppCount, APP_MILESTONES);

    if (appHit) {
      setMilestone(getMilestoneMessage(appHit, appLabel));
    } else if (totalHit) {
      setMilestone(getMilestoneMessage(totalHit));
    }

    setGameState(STATE.DONE);
  }

  function handleOpenAnyway() {
    // TODO (task #22): dismiss Screen Time overlay to open the app
    // For now, just close the game screen
    navigation.goBack();
  }

  function handleMilestoneDismiss() {
    setMilestone(null);
    navigation.goBack();
  }

  return (
    <ScreenWrapper style={styles.wrapper}>

      {/* Playing state — game placeholder, replaced per-game in tasks #12–15 */}
      {gameState === STATE.PLAYING && (
        <View style={styles.centered}>
          <AppText variant="xxl" style={styles.appEmoji}>{appEmoji}</AppText>
          <AppText variant="caption" style={styles.interceptedLabel}>
            really? {appLabel}? okay fine. beat this first.
          </AppText>
          <Card style={styles.gamePlaceholder}>
            <AppText variant="subheading" style={styles.placeholderText}>
              🎮 game goes here
            </AppText>
            <AppText variant="caption">
              (individual games built in tasks #12–15)
            </AppText>
          </Card>
          {/* Dev shortcut to skip to decision screen */}
          <Button
            label="(dev) complete game"
            variant="ghost"
            onPress={handleGameComplete}
            style={styles.devBtn}
          />
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

      {/* Done state — waiting for milestone modal or nav */}
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
  appEmoji: {
    fontSize: 56,
  },
  interceptedLabel: {
    textAlign: 'center',
    lineHeight: 20,
  },
  gamePlaceholder: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  placeholderText: {
    color: colors.textSub,
  },
  devBtn: {
    opacity: 0.4,
    marginTop: spacing.md,
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
