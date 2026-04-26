import { View, ScrollView, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import { ALL_APPS } from '../../utils/storage';
import { colors, spacing, radius } from '../../theme';

const STEPS = [
  {
    number: 1,
    title: 'open the Shortcuts app',
    body: 'tap the Automation tab at the bottom, then tap + in the top right to create a new Personal Automation.',
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
    body: 'choose the app (e.g. Instagram). set Run Immediately, then tap Next.\n\nImportant: one automation per app — repeat these steps for each gated app.',
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
    title: 'search for "Open URLs" and paste your app\'s URL',
    body: 'type "Open URLs" in the search bar and select it. then paste the URL for your app from the list at the bottom of this guide.\n\nA future update will let you simply search "FrictionMaxxing" and tap one button — no URLs needed.',
    visual: <OpenURLsVisual />,
  },
  {
    number: 6,
    title: 're-select the app and tap Done',
    body: 'tap App (must be selected ⚠️) to re-select the app you chose in step 3. the automation won\'t run without this. then tap Done.',
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
            FrictionMaxxing works through iOS Shortcuts automations — one per gated app.
            follow these steps to wire it up.
          </AppText>
        </View>

        {STEPS.map((step) => (
          <StepCard key={step.number} step={step} />
        ))}

        {/* URL reference list */}
        <View style={styles.urlSection}>
          <AppText variant="subheading" style={styles.urlTitle}>your app URLs</AppText>
          <AppText variant="base" style={styles.urlSubtitle}>
            copy the URL for each app and paste it into the "Open URLs" action in step 5.
          </AppText>
          {ALL_APPS.map((app) => {
            const url = `frictionmaxxing://game?appId=${app.id}&label=${encodeURIComponent(app.label)}`;
            return (
              <View key={app.id} style={styles.urlRow}>
                <AppText variant="base" style={styles.urlAppLabel}>{app.emoji}  {app.label}</AppText>
                <TouchableOpacity
                  style={styles.urlBox}
                  onLongPress={() => Linking.openURL(url)}
                  activeOpacity={0.7}
                >
                  <AppText variant="caption" style={styles.urlText} numberOfLines={1}>{url}</AppText>
                </TouchableOpacity>
              </View>
            );
          })}
          <AppText variant="caption" style={styles.urlNote}>
            don't see your app? add it in Settings → Usage Estimates, then use:{'\n'}
            {'frictionmaxxing://game?appId=yourapp&label=YourApp'}
          </AppText>
        </View>

        <View style={styles.footer}>
          <AppText variant="base" style={styles.footerText}>
            repeat steps 1–6 for each app you want to gate. that's it.
          </AppText>
          <AppText variant="caption" style={styles.footerNote}>
            coming soon: a one-tap setup with no URLs required.
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

function OpenURLsVisual() {
  return (
    <View style={styles.visual}>
      <View style={styles.listBox}>
        <View style={styles.searchBar}>
          <AppText variant="caption" style={styles.searchText}>🔍  Open URLs</AppText>
        </View>
        <View style={[styles.listRow, styles.listRowHighlight]}>
          <View style={styles.appIcon}><AppText>🔗</AppText></View>
          <AppText variant="base" style={{ flex: 1 }}>Open URLs</AppText>
        </View>
        <View style={[styles.listRow, { paddingVertical: spacing.sm }]}>
          <AppText variant="caption" style={[styles.listRowSub, { flex: 1 }]}>
            frictionmaxxing://game?appId=...
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

  footer:       { alignItems: 'center', paddingTop: spacing.sm, gap: spacing.xs },
  footerText:   { color: colors.textDisabled, textAlign: 'center' },
  footerNote:   { color: colors.textDisabled, textAlign: 'center', fontStyle: 'italic' },

  urlSection:   { gap: spacing.md },
  urlTitle:     { color: colors.text },
  urlSubtitle:  { color: colors.textSub, lineHeight: 22 },
  urlRow:       { gap: spacing.xs },
  urlAppLabel:  { color: colors.text },
  urlBox: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  urlText:      { color: colors.primary, fontFamily: 'monospace' },
  urlNote:      { color: colors.textDisabled, lineHeight: 20, marginTop: spacing.xs },
});
