import { View, ScrollView, TouchableOpacity, TextInput, StyleSheet, Linking, Clipboard } from 'react-native';
import { useState, useEffect } from 'react';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import { ALL_APPS, getSettings, saveSettings } from '../../utils/storage';
import { colors, spacing, radius } from '../../theme';

const FRICTION_STEPS = [
  {
    number: 1,
    title: 'open the Shortcuts app',
    body: 'tap the + button at the bottom, then tap Automation.',
    action: { label: 'Open Shortcuts', url: 'shortcuts://' },
  },
  {
    number: 2,
    title: 'tap Apps',
    body: 'scroll down in the list and tap Apps. you\'ll see:\n\n"When [app] is [opened]"\n\ntap [app] and choose the app you want to add friction to.',
  },
  {
    number: 3,
    title: 'set Automation: On, Notify: Off',
    body: 'under the app selector, set Automation to On (no confirmation prompt) and Notify to Off. then tap Next or Done.',
    visual: <AutomationSettingsVisual />,
  },
  {
    number: 4,
    title: 'add a URL action',
    body: 'tap Add Action, then search "URL" and select it. paste your app\'s URL from the list below into the URL field.',
    visual: <URLActionVisual />,
  },
  {
    number: 5,
    title: 'add an Open URLs action',
    body: 'tap + to add another action. search "Open URLs" and select it. make sure it appears after the URL action.',
    visual: <OpenURLsVisual />,
  },
  {
    number: 6,
    title: 'tap Done',
    body: 'tap Done to save. repeat steps 1–6 for each app you want to add friction to.',
  },
];

export default function TutorialScreen({ navigation }) {
  const [customApps, setCustomApps] = useState([]);
  const [newAppName, setNewAppName] = useState('');

  useEffect(() => {
    getSettings().then((s) => setCustomApps(s.customApps ?? []));
  }, []);

  async function handleAddApp() {
    const name = newAppName.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!id) return;
    const newApp = { id, label: name, emoji: '📱' };
    const updated = [...customApps, newApp];
    setCustomApps(updated);
    setNewAppName('');
    await saveSettings({ customApps: updated });
  }

  async function handleRemoveApp(id) {
    const updated = customApps.filter((a) => a.id !== id);
    setCustomApps(updated);
    await saveSettings({ customApps: updated });
  }

  const allApps = [...ALL_APPS, ...customApps];

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <AppText variant="base" style={styles.backText}>← back</AppText>
          </TouchableOpacity>
          <AppText variant="xxl">setup guide</AppText>
          <AppText variant="base" style={styles.subtitle}>
            FrictionMaxxing works through iOS Shortcuts automations — one per app.
            follow these steps to wire it up.
          </AppText>
        </View>

        {FRICTION_STEPS.map((step) => (
          <StepCard key={step.number} step={step} />
        ))}

        {/* URL reference list */}
        <View style={styles.urlSection}>
          <AppText variant="subheading" style={styles.urlTitle}>your app URLs</AppText>
          <AppText variant="base" style={styles.urlSubtitle}>
            tap any URL to copy it, then paste into the URL action in step 4.
          </AppText>

          {allApps.map((app) => {
            const url = `frictionmaxxing://game?appId=${app.id}&label=${encodeURIComponent(app.label)}`;
            return (
              <UrlRow
                key={app.id}
                app={app}
                url={url}
                isCustom={customApps.some((c) => c.id === app.id)}
                onRemove={() => handleRemoveApp(app.id)}
              />
            );
          })}

          {/* Add custom app */}
          <View style={styles.addAppSection}>
            <AppText variant="base" style={styles.addAppTitle}>don't see your app? add it:</AppText>
            <View style={styles.addAppRow}>
              <TextInput
                style={styles.addAppInput}
                placeholder="app name (e.g. Duolingo)"
                placeholderTextColor={colors.textDisabled}
                value={newAppName}
                onChangeText={setNewAppName}
                onSubmitEditing={handleAddApp}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.addAppBtn, !newAppName.trim() && styles.addAppBtnDisabled]}
                onPress={handleAddApp}
                disabled={!newAppName.trim()}
                activeOpacity={0.7}
              >
                <AppText variant="base" style={styles.addAppBtnText}>add</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <AppText variant="base" style={styles.footerText}>
            repeat steps 1–6 for each app you want to gate. that's it.
          </AppText>
          <AppText variant="caption" style={styles.footerNote}>
            coming soon: one-tap setup with no URLs required.
          </AppText>
        </View>

      </ScrollView>
    </ScreenWrapper>
  );
}

function UrlRow({ app, url, isCustom, onRemove }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    Clipboard.setString(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={styles.urlRow}>
      <View style={styles.urlRowTop}>
        <AppText variant="base" style={styles.urlAppLabel}>{app.emoji}  {app.label}</AppText>
        {isCustom && (
          <TouchableOpacity onPress={onRemove} activeOpacity={0.6}>
            <AppText variant="caption" style={styles.removeText}>remove</AppText>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={[styles.urlBox, copied && styles.urlBoxCopied]}
        onPress={handleCopy}
        activeOpacity={0.7}
      >
        {copied
          ? <AppText variant="caption" style={styles.urlCopiedText}>copied!</AppText>
          : <AppText variant="caption" style={styles.urlText} numberOfLines={1}>{url}</AppText>
        }
      </TouchableOpacity>
    </View>
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

function AutomationSettingsVisual() {
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

  footer:       { alignItems: 'center', paddingTop: spacing.sm, gap: spacing.xs },
  footerText:   { color: colors.textDisabled, textAlign: 'center' },
  footerNote:   { color: colors.textDisabled, textAlign: 'center', fontStyle: 'italic' },

  urlSection:   { gap: spacing.md },
  urlTitle:     { color: colors.text },
  urlSubtitle:  { color: colors.textSub, lineHeight: 22 },
  urlRow:       { gap: spacing.xs },
  urlRowTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  urlAppLabel:  { color: colors.text },
  removeText:   { color: colors.textDisabled },
  urlBox: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  urlBoxCopied: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  urlText:      { color: colors.primary, fontFamily: 'monospace' },
  urlCopiedText: { color: colors.primary, fontWeight: '600', textAlign: 'center' },

  addAppSection: { gap: spacing.sm, marginTop: spacing.sm },
  addAppTitle:  { color: colors.textSub },
  addAppRow:    { flexDirection: 'row', gap: spacing.sm },
  addAppInput: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    color: colors.text,
  },
  addAppBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  addAppBtnDisabled: { opacity: 0.4 },
  addAppBtnText: { color: '#fff', fontWeight: '600' },
});
