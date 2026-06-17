import { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Modal, AppState } from 'react-native';
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
  getToday,
  recordEvent,
} from '../../utils/storage';
import { isInFreeZone } from '../../utils/location';
import { ALL_APPS, APP_BUNDLE_IDS } from '../../utils/storage';
import { scheduleTimeConstraintNotifications } from '../../utils/notifications';
import FrictionMaxxingNative from '../../native/FrictionMaxxingNative';
import { colors, spacing, radius } from '../../theme';

// Game flow states
const STATE = {
  LOADING:         'loading',          // fetching settings + location check
  QUOTA_GATE:      'quota_gate',       // daily game quota not met — play games first
  QUOTA_ONE_DONE:  'quota_one_done',   // one-at-a-time mode: game done, close and come back
  INTERCEPT:       'intercept',        // One Sec-style loading screen with stats
  FREE_ZONE:       'free_zone',        // user is in a free zone — skip the game
  PLAYING:         'playing',          // game in progress
  DECISION:        'decision',         // game beaten — open anyway or walk away?
  TIME_CONSTRAINT: 'time_constraint',  // pick a session duration before opening
  REENTRY_WAIT:    'reentry_wait',     // mandatory loading screen before app opens
  DONE:            'done',             // user made their choice
};

const TIME_CONSTRAINT_PRESETS = [
  { label: '30 sec',  seconds: 30  },
  { label: '1 min',   seconds: 60  },
  { label: '90 sec',  seconds: 90  },
  { label: '2.5 min', seconds: 150 },
  { label: '5 min',   seconds: 300 },
];

function formatDuration(seconds) {
  if (!seconds) return '';
  if (seconds < 60) return `${seconds} sec`;
  if (seconds === 90) return '90 sec';
  const mins = seconds / 60;
  return `${Number.isInteger(mins) ? mins : mins.toFixed(1)} min`;
}

const INTERCEPT_DURATIONS = { easy: 30000, medium: 45000, hard: 60000 };
function getInterceptDuration(diff) {
  return INTERCEPT_DURATIONS[diff] ?? 20000;
}

const PHONE_DOWN_DELAYS = { easy: 150000, medium: 210000, hard: 300000 }; // 2.5 / 3.5 / 5 min
function getPhoneDownDelay(diff) {
  return PHONE_DOWN_DELAYS[diff] ?? 210000;
}

const PHONE_DOWN_MESSAGES = [
  "seriously. put the phone down.",
  "you've been at this a while. it's okay to stop.",
  "the game will still be here. your life won't wait.",
  "hey. breathe. put it down.",
];


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
  const timeCapExhausted = route?.params?.timeCapExhausted === 'true';
  // lockout=true means the user arrived via a ShieldAction tap (lockout mode).
  // After winning the game, we unblock all gated apps for the lockout window,
  // then re-block them. No "open anyway" option in lockout mode.
  const isLockoutMode = route?.params?.lockout === 'true';

  const [gameState, setGameState] = useState(STATE.LOADING);
  const [selectedGame, setSelectedGame] = useState(null);
  const [difficulty, setDifficulty]     = useState('medium');
  const [milestone, setMilestone] = useState(null);

  // Daily open limit — walk away is the only option once the cap is reached
  const [openLimitExhausted, setOpenLimitExhausted] = useState(false);

  // Quota tracking
  const [quotaRequired, setQuotaRequired]   = useState(0);
  const [quotaCompleted, setQuotaCompleted] = useState(0);
  const isQuotaGame = useRef(false); // true while playing a quota-fulfillment game

  // Long-session nudge
  const [showPhoneDown, setShowPhoneDown] = useState(false);
  const [phoneDownMessage, setPhoneDownMessage] = useState('');

  // Time constraint
  const [timeConstraintEnabled, setTimeConstraintEnabled] = useState(false);
  const selectedDurationRef = useRef(null); // seconds chosen in TIME_CONSTRAINT or lockout session picker
  const reentryProgressAnim = useRef(new Animated.Value(0)).current;


  // Intercept screen state
  const [count24h, setCount24h]             = useState(0);
  const [lastAttemptMs, setLastAttemptMs]   = useState(null); // ms since last event for this app
  const [avgDailyMinutes, setAvgDailyMinutes] = useState(null); // null = no estimate on file
  const [interceptMessage, setInterceptMessage] = useState('');
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Track whether a final event has already been recorded this session.
  // If the component unmounts without one, it counts as a rage-quit.
  const eventRecorded = useRef(false);

  // Load settings, check free zone, compute intercept stats, then show intercept screen
  useEffect(() => {
    async function init() {
      const [s, events] = await Promise.all([getSettings(), getEvents()]);

      // If schedule blocking is enabled, check whether we're inside the active window
      if (s.scheduleBlock?.enabled) {
        const now     = new Date();
        const nowHour = now.getHours();
        const nowDay  = now.getDay(); // 0=Sun … 6=Sat
        const { startHour = 8, endHour = 17, activeDays = [0,1,2,3,4,5,6] } = s.scheduleBlock;
        const dayActive  = activeDays.includes(nowDay);
        const inWindow   = startHour < endHour
          ? nowHour >= startHour && nowHour < endHour
          : nowHour >= startHour || nowHour < endHour;
        if (!dayActive || !inWindow) {
          eventRecorded.current = true;
          setGameState(STATE.FREE_ZONE);
          return;
        }
      }

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
      setTimeConstraintEnabled(s.timeConstraint?.enabled ?? true);

      // Check daily open limit — count successful opens for this app today
      if (s.dailyOpenLimit?.enabled) {
        const opensToday = events.filter(
          (e) => e.appId === appId && e.date === getToday() && e.gameCompleted && !e.walkedAway
        ).length;
        if (opensToday >= (s.dailyOpenLimit.limit ?? 3)) {
          setOpenLimitExhausted(true);
        }
      }

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

      // Daily screen time estimate for this app (weeklyMinutes / 7).
      // [POST-MAC #20] replace with real per-app daily average from DeviceActivityReport.
      // When screenTimePermissionGranted = true, read actual avg from the native bridge instead.
      const est = s.appUsageEstimates?.[appId];
      if (est?.weeklyMinutes) {
        setAvgDailyMinutes(Math.round(est.weeklyMinutes / 7));
      }

      // Check daily game quota
      // Total games required per day (including the intercept game itself):
      //   easy=5, medium=7, hard=10
      // Gate fires until user has pre-beaten (total - 1) games; the intercept game counts as the last.
      const QUOTA_TOTALS = { easy: 5, medium: 7, hard: 10 };
      const quota = s.dailyQuota ?? { enabled: false };
      if (quota.enabled) {
        const diff = s.difficulty ?? 'medium';
        const quotaTotal = QUOTA_TOTALS[diff] ?? 5;
        const gateThreshold = quotaTotal - 1; // pre-games needed before intercept unlocks
        const completedToday = events.filter((e) => e.gameCompleted && e.date === getToday()).length;
        setQuotaRequired(quotaTotal);
        setQuotaCompleted(completedToday);
        if (completedToday < gateThreshold) {
          setGameState(STATE.QUOTA_GATE);
          return;
        }
      }

      setGameState(STATE.INTERCEPT);
    }
    init();
  }, []);

  // Intercept screen: animate progress bar and auto-advance after INTERCEPT_DURATION.
  // Resets on background — you can't leave and come back to skip the wait.
  useEffect(() => {
    if (gameState !== STATE.INTERCEPT) return;

    let currentAnim = null;

    function startAnim() {
      progressAnim.setValue(0);
      currentAnim = Animated.timing(progressAnim, {
        toValue: 1,
        duration: getInterceptDuration(difficulty),
        useNativeDriver: false,
      });
      currentAnim.start(({ finished }) => {
        if (finished) setGameState(STATE.PLAYING);
      });
    }

    startAnim();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        currentAnim?.stop();
      } else {
        // Returned to foreground — reset and restart the full countdown
        startAnim();
      }
    });

    return () => {
      currentAnim?.stop();
      sub.remove();
    };
  }, [gameState, difficulty]);

  // Reentry wait — mandatory loading screen after picking a time constraint duration.
  // Resets on background — you can't leave and come back to skip the wait.
  useEffect(() => {
    if (gameState !== STATE.REENTRY_WAIT) return;

    let currentAnim = null;
    const duration = selectedDurationRef.current;

    function startAnim() {
      reentryProgressAnim.setValue(0);
      currentAnim = Animated.timing(reentryProgressAnim, {
        toValue: 1,
        duration: getInterceptDuration(difficulty),
        useNativeDriver: false,
      });
      currentAnim.start(async ({ finished }) => {
        if (!finished) return;
        eventRecorded.current = true;
        await recordEvent({ appId, appLabel, appEmoji, gameCompleted: true, walkedAway: false });
        await scheduleTimeConstraintNotifications(appLabel, duration);
        navigation.goBack();
      });
    }

    startAnim();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        currentAnim?.stop();
      } else {
        startAnim();
      }
    });

    return () => {
      currentAnim?.stop();
      sub.remove();
    };
  }, [gameState]);

  // Long-session nudge — show "put the phone down" modal after threshold
  useEffect(() => {
    if (gameState !== STATE.PLAYING) return;
    const msg = PHONE_DOWN_MESSAGES[Math.floor(Math.random() * PHONE_DOWN_MESSAGES.length)];
    const timer = setTimeout(() => {
      setPhoneDownMessage(msg);
      setShowPhoneDown(true);
    }, getPhoneDownDelay(difficulty));
    return () => clearTimeout(timer);
  }, [gameState, difficulty]);

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

  async function handleGameComplete() {
    if (isQuotaGame.current) {
      isQuotaGame.current = false;
      await recordEvent({ appId, appLabel, appEmoji, gameCompleted: true, walkedAway: false });
      const newCompleted = quotaCompleted + 1;
      setQuotaCompleted(newCompleted);

      if (newCompleted >= quotaRequired - 1) {
        // Pre-games done — proceed to normal intercept (which is the final quota game)
        setGameState(STATE.INTERCEPT);
      } else {
        // Close after each game — user opens the app again to keep accumulating
        setGameState(STATE.QUOTA_ONE_DONE);
      }
      return;
    }
    if (isLockoutMode) {
      // Lockout mode: no "open anyway" decision screen — just unblock and close.
      // Unblock all gated apps for the lockout window, then re-lock automatically.
      await handleLockoutWin();
      return;
    }
    setGameState(STATE.DECISION);
  }

  async function handleLockoutWin() {
    eventRecorded.current = true;
    await recordEvent({ appId, appLabel, appEmoji, gameCompleted: true, walkedAway: false });
    const s = await getSettings();
    const windowMinutes = s.lockoutWindowMinutes ?? 1;
    // Unblock all gated apps — user can now open the app they were trying to reach.
    // The native module re-locks everything after windowMinutes automatically.
    FrictionMaxxingNative.unblockAll();
    setTimeout(async () => {
      const fresh = await getSettings();
      const hiddenIds = fresh.hiddenAppIds ?? [];
      const bundleIds = ALL_APPS
        .map((a) => a.id)
        .filter((id) => !hiddenIds.includes(id))
        .map((id) => APP_BUNDLE_IDS[id])
        .filter(Boolean);
      if (bundleIds.length > 0) FrictionMaxxingNative.blockApps(bundleIds);
    }, windowMinutes * 60 * 1000);
    navigation.goBack();
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
    if (timeConstraintEnabled) {
      setGameState(STATE.TIME_CONSTRAINT);
      return;
    }
    eventRecorded.current = true;
    await recordEvent({ appId, appLabel, appEmoji, gameCompleted: true, walkedAway: false });
    navigation.goBack();
  }

  function handleSelectDuration(seconds) {
    selectedDurationRef.current = seconds;
    setGameState(STATE.REENTRY_WAIT);
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

      {/* Quota gate — daily game quota not yet met */}
      {gameState === STATE.QUOTA_GATE && (
        <View style={styles.centered}>
          <AppText variant="xxl" style={styles.winEmoji}>📚</AppText>
          <AppText variant="xxl" style={styles.decisionTitle}>do your games first.</AppText>
          <AppText variant="caption" style={styles.decisionSub}>
            {quotaCompleted} of {quotaRequired} done today.
            {'\n'}beat one game — open the app again to keep going.
          </AppText>
          <View style={styles.decisionButtons}>
            <Button
              label="play a game →"
              variant="primary"
              onPress={() => {
                isQuotaGame.current = true;
                setGameState(STATE.PLAYING);
              }}
            />
            <TouchableOpacity
              onPress={handleInterceptWalkAway}
              style={styles.openAnywayBtn}
              activeOpacity={0.5}
            >
              <AppText variant="caption" style={styles.openAnywayText}>
                never mind, i don't need {appLabel}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Quota one-at-a-time done — 1 game beaten, close and come back */}
      {gameState === STATE.QUOTA_ONE_DONE && (
        <View style={styles.centered}>
          <AppText variant="xxl" style={styles.winEmoji}>✓</AppText>
          <AppText variant="xxl" style={styles.decisionTitle}>
            {quotaCompleted} of {quotaRequired} done.
          </AppText>
          <AppText variant="caption" style={styles.decisionSub}>
            {quotaCompleted >= quotaRequired - 1
              ? `one more — open ${appLabel} again to finish.`
              : `open any blocked app again to keep going.`
            }
          </AppText>
          <View style={styles.decisionButtons}>
            <Button label="got it" variant="primary" onPress={() => navigation.goBack()} />
          </View>
        </View>
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
            <View style={styles.statRow}>
              <AppText variant="caption" style={styles.statLast}>
                avg daily screen time:{' '}
                <AppText variant="caption" style={avgDailyMinutes !== null ? styles.statLastHighlight : styles.statPlaceholder}>
                  {avgDailyMinutes !== null
                    ? (avgDailyMinutes >= 60
                        ? `${Math.floor(avgDailyMinutes / 60)}h ${avgDailyMinutes % 60}m`
                        : `${avgDailyMinutes}m`)
                    : 'not set — add in Usage Estimates · real-time after Screen Time permission'}
                </AppText>
              </AppText>
            </View>
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
          {(timeCapExhausted || openLimitExhausted) ? (
            <>
              <AppText variant="caption" style={styles.decisionSub}>
                {openLimitExhausted
                  ? `you've hit your daily open limit for ${appLabel}. you set the rule — stick to it.`
                  : `that's your lot for ${appLabel} today. the limit is the limit.`}
              </AppText>
              <View style={styles.decisionButtons}>
                <Button label="walk away 💪" variant="primary" onPress={handleWalkAway} />
              </View>
            </>
          ) : (
            <>
              <AppText variant="caption" style={styles.decisionSub}>
                now you get to choose. no judgment. (okay, a little judgment.)
              </AppText>
              <View style={styles.decisionButtons}>
                <Button label="walk away 💪" variant="primary" onPress={handleWalkAway} />
                <TouchableOpacity onPress={handleOpenAnyway} style={styles.openAnywayBtn} activeOpacity={0.5}>
                  <AppText variant="caption" style={styles.openAnywayText}>
                    open {appLabel} anyway
                  </AppText>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}

      {/* Time constraint — pick a session duration before the app opens */}
      {gameState === STATE.TIME_CONSTRAINT && (
        <View style={styles.centered}>
          <AppText variant="xxl" style={styles.winEmoji}>⏱</AppText>
          <AppText variant="xxl" style={styles.decisionTitle}>set a time limit.</AppText>
          <AppText variant="caption" style={styles.decisionSub}>
            you'll get a nudge when time's up. beat another game to keep going.
          </AppText>

          <View style={styles.tcGrid}>
            {TIME_CONSTRAINT_PRESETS.map(({ label, seconds }) => (
              <TouchableOpacity
                key={seconds}
                style={styles.tcPill}
                onPress={() => handleSelectDuration(seconds)}
                activeOpacity={0.7}
              >
                <AppText variant="base" style={styles.tcPillText}>{label}</AppText>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={handleWalkAway} style={styles.openAnywayBtn} activeOpacity={0.5}>
            <AppText variant="caption" style={styles.openAnywayText}>
              walk away 💪
            </AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Reentry wait — mandatory loading before app opens after picking a duration */}
      {gameState === STATE.REENTRY_WAIT && (
        <View style={styles.interceptWrapper}>
          <View style={styles.interceptTop}>
            <AppText style={styles.interceptEmoji}>{appEmoji}</AppText>
            <AppText variant="subheading" style={styles.interceptAppName}>
              {appLabel}
            </AppText>
            <AppText variant="caption" style={styles.interceptSubtitle}>
              starting your {formatDuration(selectedDurationRef.current)} session...
            </AppText>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: reentryProgressAnim.interpolate({
                    inputRange:  [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          <AppText variant="caption" style={styles.interceptMessage}>
            the clock starts when you get in.
          </AppText>
        </View>
      )}

      {/* Done state */}
      {gameState === STATE.DONE && !milestone && (
        <View style={styles.centered}>
          <AppText variant="xxl">🧘</AppText>
          <AppText variant="subheading" style={styles.doneText}>good call.</AppText>
        </View>
      )}

      {/* Long-session "put the phone down" modal */}
      <Modal
        visible={showPhoneDown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhoneDown(false)}
      >
        <View style={styles.phoneDownOverlay}>
          <View style={styles.phoneDownSheet}>
            <AppText style={styles.phoneDownEmoji}>📵</AppText>
            <AppText variant="subheading" style={styles.phoneDownTitle}>
              {phoneDownMessage}
            </AppText>
            <Button
              label="walk away 💪"
              variant="primary"
              onPress={() => {
                setShowPhoneDown(false);
                handleInterceptWalkAway();
              }}
              style={styles.phoneDownBtn}
            />
            <TouchableOpacity
              onPress={() => setShowPhoneDown(false)}
              style={styles.phoneDownKeepBtn}
              activeOpacity={0.5}
            >
              <AppText variant="caption" style={styles.phoneDownKeepText}>
                keep playing
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

  // ── Time constraint picker ────────────────────────────────────────────────────
  tcPillSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  tcPillTextSelected: {
    color: colors.primary,
  },

  // ── Time constraint picker ────────────────────────────────────────────────────
  tcGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  tcPill: {
    width: '45%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  tcPillText: {
    color: colors.text,
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
  statPlaceholder: {
    color: colors.textDisabled,
    fontStyle: 'italic',
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

  // ── Phone-down modal ──────────────────────────────────────────────────────────
  phoneDownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  phoneDownSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phoneDownEmoji: {
    fontSize: 48,
  },
  phoneDownTitle: {
    color: colors.text,
    textAlign: 'center',
    lineHeight: 28,
  },
  phoneDownBtn: {
    width: '100%',
    marginTop: spacing.sm,
  },
  phoneDownKeepBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  phoneDownKeepText: {
    color: colors.textDisabled,
    textDecorationLine: 'underline',
  },
});
