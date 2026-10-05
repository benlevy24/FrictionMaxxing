import { View, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import { colors, spacing, radius } from '../../theme';

const STEPS = [
  {
    number: 1,
    title: 'open Shortcuts and tap +',
    body: 'open the Shortcuts app and tap the + button in the top-right corner.',
    action: { label: 'open Shortcuts', url: 'shortcuts://' },
  },
  {
    number: 2,
    title: 'tap Automation → App',
    body: 'tap "Automation" from the list of categories.\n\nscroll down to the "Apps" section and tap "App".',
  },
  {
    number: 3,
    title: 'pick your app',
    body: 'tap the blue "[App]" — you\'ll see every app on your phone. pick the one you want to add friction to.\n\nleave it set to "is opened".',
  },
  {
    number: 4,
    title: 'set Automation ON, Notify OFF',
    body: 'turn "Automation" ON and "Notify" OFF. this makes it fire instantly when you open the app — no confirmation popup.\n\ntap Done.',
    visual: <AskBeforeRunningVisual />,
  },
  {
    number: 5,
    title: 'add a URL action',
    body: 'tap "New Blank Automation", then tap "Add Action".\n\nsearch "URL" and select it (the plain URL action — not Open URLs). paste your app\'s deep link from Settings → Friction Apps into the URL field.',
    visual: <URLActionVisual />,
  },
  {
    number: 6,
    title: 'add an Open URLs action',
    body: 'tap the + that appears below the URL action. search "Open URLs" and select it.\n\nit must sit below the URL action — that order matters.',
    visual: <OpenURLsVisual />,
  },
  {
    number: 7,
    title: 'tap Done',
    body: 'tap Done to save the automation.\n\nrepeat steps 1–7 for each app in your friction list. one automation per app.',
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
          <AppText variant="xxl">shortcuts guide</AppText>
          <AppText variant="base" style={styles.subtitle}>
            FrictionMaxxing intercepts apps via iOS Shortcuts automations. follow these steps once per app.
          </AppText>
          <TouchableOpacity
            style={styles.appsLink}
            onPress={() => navigation.navigate('FrictionApps')}
          >
            <AppText variant="base" style={styles.appsLinkText}>
              → first, add your apps in Friction Apps
            </AppText>
          </TouchableOpacity>
        </View>

        {STEPS.map((step) => (
          <StepCard key={step.number} step={step} />
        ))}

        <View style={styles.footer}>
          <AppText variant="caption" style={styles.footerNote}>
            coming soon: one-tap setup with no URLs required.
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

// ── Mini diagrams ─────────────────────────────────────────────────────────────

function AskBeforeRunningVisual() {
  return (
    <View style={styles.visual}>
      <View style={styles.listBox}>
        <View style={styles.listRow}>
          <AppText variant="base" style={{ flex: 1 }}>Automation</AppText>
          <View style={styles.toggleOn} />
        </View>
        <View style={styles.listRow}>
          <AppText variant="base" style={{ flex: 1 }}>Notify</AppText>
          <View style={styles.toggleOff} />
        </View>
      </View>
    </View>
  );
}

function URLActionVisual() {
  return (
    <View style={styles.visual}>
      <View style={styles.listBox}>
        <View style={styles.searchBar}>
          <AppText variant="caption" style={styles.searchText}>🔍  URL</AppText>
        </View>
        <View style={[styles.listRow, styles.listRowHighlight]}>
          <View style={styles.appIcon}><AppText>🔗</AppText></View>
          <View style={{ flex: 1 }}>
            <AppText variant="base">URL</AppText>
            <AppText variant="caption" style={styles.listRowSub}>frictionmaxxing://game?appId=...</AppText>
          </View>
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
          <View style={styles.appIcon}><AppText>🌐</AppText></View>
          <AppText variant="base" style={{ flex: 1 }}>Open URLs</AppText>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll:       { paddingBottom: 60, gap: spacing.lg },
  header:       { marginTop: spacing.xl, gap: spacing.sm },
  backBtn:      { alignSelf: 'flex-start' },
  backText:     { color: colors.primary },
  subtitle:     { color: colors.textSub, lineHeight: 22 },

  appsLink: {
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  appsLinkText: { color: colors.primary },

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
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center', justifyContent: 'center',
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

  visual: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
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
  listRowSub:   { color: colors.textDisabled },
  appIcon:      { width: 28, alignItems: 'center' },
  toggleOn: {
    width: 34, height: 20, borderRadius: 10,
    backgroundColor: colors.primary,
  },
  toggleOff: {
    width: 34, height: 20, borderRadius: 10,
    backgroundColor: colors.border,
  },
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

  footer:       { alignItems: 'center', paddingTop: spacing.sm },
  footerNote:   { color: colors.textDisabled, textAlign: 'center', fontStyle: 'italic' },
});
