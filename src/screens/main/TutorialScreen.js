import { View, ScrollView, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import { colors, spacing, radius } from '../../theme';

const STEPS = [
  {
    number: 1,
    title: 'open the Shortcuts app',
    body: 'tap the Automation tab at the bottom, then tap + to create a new Personal Automation.',
    action: { label: 'Open Shortcuts App', url: 'shortcuts://' },
    visual: <AutomationTabVisual />,
  },
  {
    number: 2,
    title: 'scroll down and select App',
    body: 'this triggers the automation whenever a specific app opens.',
    visual: <AppRowVisual />,
  },
  {
    number: 3,
    title: 'select the app to add friction to',
    body: 'choose the app (e.g. Instagram). set Run Immediately, then tap Next.\n\nImportant: one automation per app — repeat these steps for each blocked app.',
    visual: <RunImmediatelyVisual />,
  },
  {
    number: 4,
    title: 'tap Create new Shortcut',
    body: 'on the next screen, tap Create new Shortcut (not one of the suggestions).',
    visual: <CreateShortcutVisual />,
  },
  {
    number: 5,
    title: 'search for FrictionMaxxing',
    body: 'type "FrictionMaxxing" in the search bar and select Activate FrictionMaxxing (when app opens). tap Done.',
    visual: <SearchVisual />,
  },
  {
    number: 6,
    title: 're-select the app and tap Done',
    body: '⚠️ on the final screen, tap App and re-select the same app you chose in step 3. the automation won\'t run without this step. then tap Done.',
    visual: <ReSelectAppVisual />,
  },
];

export default function TutorialScreen({ navigation }) {
  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <AppText variant="base" style={styles.backText}>← back</AppText>
          </TouchableOpacity>
          <AppText variant="xxl">setup guide</AppText>
          <AppText variant="base" style={styles.subtitle}>
            FrictionMaxxing works through iOS Shortcuts automations — one per blocked app.
            follow these steps to wire it up.
          </AppText>
        </View>

        {STEPS.map((step) => (
          <StepCard key={step.number} step={step} />
        ))}

        <View style={styles.footer}>
          <AppText variant="base" style={styles.footerText}>
            repeat steps 1–6 for each app you want to block. that's it.
          </AppText>
        </View>

      </ScrollView>
    </ScreenWrapper>
  );
}

function StepCard({ step }) {
  return (
    <View style={styles.card}>
      <View style={styles.stepHeader}>
        <View style={styles.badge}>
          <AppText variant="base" style={styles.badgeText}>{step.number}</AppText>
        </View>
        <AppText variant="subheading" style={styles.stepTitle}>{step.title}</AppText>
      </View>

      <AppText variant="base" style={styles.stepBody}>{step.body}</AppText>

      {step.visual}

      {step.action && (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => Linking.openURL(step.action.url)}
        >
          <AppText variant="base" style={styles.actionBtnText}>{step.action.label}</AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Mini diagrams ────────────────────────────────────────────────────────────

function AutomationTabVisual() {
  const tabs = ['Shortcuts', 'Automation', 'Gallery'];
  return (
    <View style={styles.visual}>
      <View style={styles.tabBar}>
        {tabs.map((t) => (
          <View
            key={t}
            style={[styles.tab, t === 'Automation' && styles.tabActive]}
          >
            <AppText
              variant="caption"
              style={t === 'Automation' ? styles.tabLabelActive : styles.tabLabel}
            >
              {t}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

function AppRowVisual() {
  return (
    <View style={styles.visual}>
      <View style={styles.listBox}>
        <View style={[styles.listRow, styles.listRowHighlight]}>
          <View style={styles.listRowIcon}><AppText variant="caption">↗</AppText></View>
          <View style={styles.listRowText}>
            <AppText variant="base">App</AppText>
            <AppText variant="caption" style={styles.listRowSub}>e.g. "When Instagram is opened"</AppText>
          </View>
          <AppText variant="caption" style={styles.listRowChevron}>›</AppText>
        </View>
        <View style={styles.listRow}>
          <View style={styles.listRowIcon}><AppText variant="caption">✈</AppText></View>
          <View style={styles.listRowText}>
            <AppText variant="base">Airplane Mode</AppText>
            <AppText variant="caption" style={styles.listRowSub}>e.g. "When turned on"</AppText>
          </View>
          <AppText variant="caption" style={styles.listRowChevron}>›</AppText>
        </View>
      </View>
    </View>
  );
}

function RunImmediatelyVisual() {
  return (
    <View style={styles.visual}>
      <View style={styles.listBox}>
        <View style={styles.listRow}>
          <AppText variant="base" style={{ flex: 1 }}>Run After Confirmation</AppText>
          <View style={styles.radioEmpty} />
        </View>
        <View style={[styles.listRow, styles.listRowHighlight]}>
          <AppText variant="base" style={{ flex: 1 }}>Run Immediately</AppText>
          <View style={styles.radioFilled} />
        </View>
        <View style={styles.listRow}>
          <AppText variant="base" style={{ flex: 1 }}>Notify When Run</AppText>
          <View style={styles.toggleOff} />
        </View>
      </View>
    </View>
  );
}

function CreateShortcutVisual() {
  return (
    <View style={styles.visual}>
      <View style={styles.listBox}>
        <View style={styles.hintRow}>
          <AppText variant="caption" style={styles.hintText}>Get Started ›</AppText>
        </View>
        <View style={styles.tileRow}>
          <View style={[styles.tile, styles.tileHighlight]}>
            <AppText variant="caption" style={{ textAlign: 'center' }}>Create New Shortcut</AppText>
          </View>
          <View style={styles.tile}>
            <AppText variant="caption" style={{ textAlign: 'center' }}>Start Timer</AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

function SearchVisual() {
  return (
    <View style={styles.visual}>
      <View style={styles.listBox}>
        <View style={styles.searchBar}>
          <AppText variant="caption" style={styles.searchText}>🔍  FrictionMaxxing</AppText>
        </View>
        <View style={[styles.listRow, styles.listRowHighlight]}>
          <View style={styles.appIcon}><AppText>🛑</AppText></View>
          <AppText variant="base" style={{ flex: 1 }}>
            Activate FrictionMaxxing (when app opens)
          </AppText>
        </View>
      </View>
    </View>
  );
}

function ReSelectAppVisual() {
  return (
    <View style={styles.visual}>
      <View style={styles.listBox}>
        <View style={[styles.listRow, styles.listRowHighlight]}>
          <View style={styles.listRowIcon}><AppText variant="caption">↗</AppText></View>
          <View style={styles.listRowText}>
            <AppText variant="base">App</AppText>
            <AppText variant="caption" style={styles.listRowSub}>tap to re-select (e.g. Instagram)</AppText>
          </View>
          <AppText variant="caption" style={{ color: colors.primary }}>⚠️</AppText>
        </View>
        <View style={styles.listRow}>
          <View style={styles.listRowIcon}><AppText variant="caption">🛑</AppText></View>
          <View style={styles.listRowText}>
            <AppText variant="base">Activate FrictionMaxxing</AppText>
            <AppText variant="caption" style={styles.listRowSub}>when app opens</AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll:       { paddingBottom: spacing.xxl, gap: spacing.lg },
  header:       { marginTop: spacing.xl, gap: spacing.sm },
  backBtn:      { alignSelf: 'flex-start' },
  backText:     { color: colors.primary },
  subtitle:     { color: colors.textSub, lineHeight: 22 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepHeader:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText:    { color: colors.primary, fontWeight: '700' },
  stepTitle:    { flex: 1 },
  stepBody:     { color: colors.textSub, lineHeight: 22 },

  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  actionBtnText: { color: '#fff', fontWeight: '600' },

  // Visual container
  visual: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Tab bar
  tabBar:       { flexDirection: 'row', backgroundColor: colors.surfaceRaised },
  tab:          { flex: 1, paddingVertical: spacing.sm, alignItems: 'center' },
  tabActive:    { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabLabel:     { color: colors.textDisabled },
  tabLabelActive: { color: colors.primary },

  // List box (shared)
  listBox:      { backgroundColor: colors.surfaceRaised },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listRowHighlight: { backgroundColor: colors.primaryMuted },
  listRowIcon:  { width: 24, alignItems: 'center' },
  listRowText:  { flex: 1, gap: 2 },
  listRowSub:   { color: colors.textDisabled },
  listRowChevron: { color: colors.textDisabled },

  // Radio / toggle indicators
  radioEmpty: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: colors.textDisabled,
  },
  radioFilled: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.primary,
  },
  toggleOff: {
    width: 34, height: 20, borderRadius: 10,
    backgroundColor: colors.border,
  },

  // Create shortcut tiles
  hintRow: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  hintText:     { color: colors.textSub },
  tileRow: {
    flexDirection: 'row',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  tile: {
    width: 90, height: 70,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileHighlight: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },

  // Search bar
  searchBar: {
    backgroundColor: colors.surface,
    margin: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchText:   { color: colors.textSub },
  appIcon:      { width: 28, alignItems: 'center' },

  footer:       { alignItems: 'center', paddingTop: spacing.sm },
  footerText:   { color: colors.textDisabled, textAlign: 'center' },
});
