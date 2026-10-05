import { View, ScrollView, TouchableOpacity, TextInput, StyleSheet, Clipboard, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import { ALL_APPS, getSettings, saveSettings } from '../../utils/storage';
import { colors, spacing, radius } from '../../theme';

export default function FrictionAppsScreen({ navigation }) {
  const [gatedAppIds, setGatedAppIds] = useState([]);
  const [customApps, setCustomApps] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [customName, setCustomName] = useState('');

  useFocusEffect(
    useCallback(() => {
      getSettings().then((s) => {
        setGatedAppIds(s.gatedAppIds ?? []);
        setCustomApps(s.customApps ?? []);
      });
    }, [])
  );

  const allApps = [...ALL_APPS, ...customApps];
  const gatedApps = allApps.filter((a) => gatedAppIds.includes(a.id));

  async function toggleApp(id) {
    const updated = gatedAppIds.includes(id)
      ? gatedAppIds.filter((x) => x !== id)
      : [...gatedAppIds, id];
    setGatedAppIds(updated);
    await saveSettings({ gatedAppIds: updated });
  }

  async function handleAddCustom() {
    const name = customName.trim();
    if (!name) return;
    const id = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!id.replace('custom_', '')) return;

    // Check for duplicate
    if (allApps.some((a) => a.id === id)) {
      const updated = gatedAppIds.includes(id) ? gatedAppIds : [...gatedAppIds, id];
      setGatedAppIds(updated);
      await saveSettings({ gatedAppIds: updated });
      setCustomName('');
      setShowPicker(false);
      return;
    }

    const newApp = { id, label: name, emoji: '📱' };
    const updatedCustom = [...customApps, newApp];
    const updatedGated = [...gatedAppIds, id];
    setCustomApps(updatedCustom);
    setGatedAppIds(updatedGated);
    setCustomName('');
    setShowPicker(false);
    await saveSettings({ customApps: updatedCustom, gatedAppIds: updatedGated });
  }

  async function handleRemove(id) {
    Alert.alert(
      'remove app?',
      'this app will no longer have friction. you can add it back any time.',
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'remove',
          style: 'destructive',
          onPress: async () => {
            const updatedGated = gatedAppIds.filter((x) => x !== id);
            setGatedAppIds(updatedGated);
            // If it's a custom app, also remove from customApps
            const updatedCustom = customApps.filter((a) => a.id !== id);
            setCustomApps(updatedCustom);
            await saveSettings({ gatedAppIds: updatedGated, customApps: updatedCustom });
          },
        },
      ]
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <AppText variant="base" style={styles.backText}>← back</AppText>
          </TouchableOpacity>
          <AppText variant="xxl">friction apps</AppText>
          <AppText variant="base" style={styles.subtitle}>
            apps on this list get intercepted with a game when you try to open them.
            you'll set up a Shortcut for each one — tap "shortcuts guide" in settings when ready.
          </AppText>
        </View>

        {/* Active friction apps */}
        {gatedApps.length === 0 ? (
          <View style={styles.emptyState}>
            <AppText variant="lg" style={styles.emptyEmoji}>🛑</AppText>
            <AppText variant="base" style={styles.emptyText}>no apps added yet</AppText>
            <AppText variant="caption" style={styles.emptySubtext}>
              tap "add app" below to start gating apps
            </AppText>
          </View>
        ) : (
          <View style={styles.appList}>
            {gatedApps.map((app) => (
              <GatedAppRow
                key={app.id}
                app={app}
                onRemove={() => handleRemove(app.id)}
              />
            ))}
          </View>
        )}

        {/* Add app button */}
        {!showPicker && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
            <AppText variant="base" style={styles.addBtnText}>+ add app</AppText>
          </TouchableOpacity>
        )}

        {/* App picker */}
        {showPicker && (
          <View style={styles.picker}>
            <View style={styles.pickerHeader}>
              <AppText variant="subheading">choose an app</AppText>
              <TouchableOpacity onPress={() => { setShowPicker(false); setCustomName(''); }}>
                <AppText variant="base" style={styles.pickerClose}>✕</AppText>
              </TouchableOpacity>
            </View>

            {ALL_APPS.map((app) => {
              const isGated = gatedAppIds.includes(app.id);
              return (
                <TouchableOpacity
                  key={app.id}
                  style={[styles.pickerRow, isGated && styles.pickerRowActive]}
                  onPress={() => { toggleApp(app.id); if (!isGated) setShowPicker(false); }}
                  activeOpacity={0.7}
                >
                  <AppText variant="base" style={styles.pickerEmoji}>{app.emoji}</AppText>
                  <AppText variant="base" style={[styles.pickerLabel, isGated && styles.pickerLabelActive]}>
                    {app.label}
                  </AppText>
                  {isGated && <AppText variant="caption" style={styles.pickerCheck}>✓ added</AppText>}
                </TouchableOpacity>
              );
            })}

            {/* Custom app entry */}
            <View style={styles.customSection}>
              <AppText variant="caption" style={styles.customLabel}>don't see your app?</AppText>
              <View style={styles.customRow}>
                <TextInput
                  style={styles.customInput}
                  placeholder="type app name (e.g. Duolingo)"
                  placeholderTextColor={colors.textDisabled}
                  value={customName}
                  onChangeText={setCustomName}
                  onSubmitEditing={handleAddCustom}
                  returnKeyType="done"
                  autoCapitalize="words"
                />
                <TouchableOpacity
                  style={[styles.customAddBtn, !customName.trim() && styles.customAddBtnDisabled]}
                  onPress={handleAddCustom}
                  disabled={!customName.trim()}
                  activeOpacity={0.7}
                >
                  <AppText variant="base" style={styles.customAddBtnText}>add</AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* URL reference for Shortcuts setup */}
        {gatedApps.length > 0 && (
          <View style={styles.urlSection}>
            <AppText variant="subheading" style={styles.urlTitle}>shortcut URLs</AppText>
            <AppText variant="caption" style={styles.urlSubtitle}>
              you'll paste these into Shortcuts — one per app. tap to copy.
            </AppText>
            {gatedApps.map((app) => (
              <UrlRow key={app.id} app={app} />
            ))}
          </View>
        )}

      </ScrollView>
    </ScreenWrapper>
  );
}

function GatedAppRow({ app, onRemove }) {
  return (
    <View style={styles.gatedRow}>
      <AppText variant="lg" style={styles.gatedEmoji}>{app.emoji}</AppText>
      <AppText variant="base" style={styles.gatedLabel}>{app.label}</AppText>
      <TouchableOpacity onPress={onRemove} activeOpacity={0.6} style={styles.removeBtn}>
        <AppText variant="caption" style={styles.removeText}>remove</AppText>
      </TouchableOpacity>
    </View>
  );
}

function UrlRow({ app }) {
  const [copied, setCopied] = useState(false);
  const url = `frictionmaxxing://game?appId=${app.id}&label=${encodeURIComponent(app.label)}`;

  function handleCopy() {
    Clipboard.setString(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={styles.urlRow}>
      <AppText variant="caption" style={styles.urlAppLabel}>{app.emoji}  {app.label}</AppText>
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

const styles = StyleSheet.create({
  scroll:       { paddingBottom: 60, gap: spacing.lg },
  header:       { marginTop: spacing.xl, gap: spacing.sm },
  backBtn:      { alignSelf: 'flex-start' },
  backText:     { color: colors.primary },
  subtitle:     { color: colors.textSub, lineHeight: 22 },

  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyEmoji:   { fontSize: 36 },
  emptyText:    { color: colors.textSub },
  emptySubtext: { color: colors.textDisabled, textAlign: 'center' },

  appList:      { gap: spacing.sm },
  gatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  gatedEmoji:   { width: 28, textAlign: 'center' },
  gatedLabel:   { flex: 1 },
  removeBtn:    { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  removeText:   { color: colors.textDisabled },

  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  addBtnText:   { color: '#fff', fontWeight: '600' },

  picker: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerClose:  { color: colors.textSub, fontSize: 18 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerRowActive: { backgroundColor: colors.primaryMuted },
  pickerEmoji:  { width: 28, textAlign: 'center' },
  pickerLabel:  { flex: 1 },
  pickerLabelActive: { color: colors.primary },
  pickerCheck:  { color: colors.primary },

  customSection: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  customLabel:  { color: colors.textSub },
  customRow:    { flexDirection: 'row', gap: spacing.sm },
  customInput: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    color: colors.text,
  },
  customAddBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  customAddBtnDisabled: { opacity: 0.4 },
  customAddBtnText: { color: '#fff', fontWeight: '600' },

  urlSection:   { gap: spacing.sm, marginTop: spacing.sm },
  urlTitle:     {},
  urlSubtitle:  { color: colors.textSub, lineHeight: 20 },
  urlRow:       { gap: 4 },
  urlAppLabel:  { color: colors.textSub },
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
});
