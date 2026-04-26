import { useState, useCallback } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import { getSettings, saveSettings, ALL_APPS } from '../../utils/storage';
import { colors, spacing, radius } from '../../theme';

export default function UsageEstimatesScreen({ navigation }) {
  const [estimates, setEstimates]     = useState({});
  const [customApps, setCustomApps]   = useState([]);
  const [newAppName, setNewAppName]   = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSettings().then((s) => {
        if (!active) return;
        setEstimates(s.appUsageEstimates ?? {});
        setCustomApps(s.customApps ?? []);
      });
      return () => { active = false; };
    }, [])
  );

  async function handleChange(appId, field, raw) {
    const value = parseInt(raw, 10);
    const next = {
      ...estimates,
      [appId]: {
        ...(estimates[appId] ?? {}),
        [field]: isNaN(value) ? 0 : value,
      },
    };
    setEstimates(next);
    await saveSettings({ appUsageEstimates: next });
  }

  async function handleAddApp() {
    const name = newAppName.trim();
    if (!name) return;
    const id = `custom_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const next = [...customApps, { id, label: name, emoji: '📱' }];
    setCustomApps(next);
    setNewAppName('');
    await saveSettings({ customApps: next });
  }

  async function handleRemoveCustomApp(id) {
    const nextApps = customApps.filter((a) => a.id !== id);
    const nextEst = { ...estimates };
    delete nextEst[id];
    setCustomApps(nextApps);
    setEstimates(nextEst);
    await saveSettings({ customApps: nextApps, appUsageEstimates: nextEst });
  }

  const allApps = [...ALL_APPS, ...customApps];

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <AppText variant="base" style={styles.backText}>← back</AppText>
          </TouchableOpacity>
          <AppText variant="xxl">usage estimates</AppText>
          <AppText variant="base" style={styles.subtitle}>
            enter your weekly totals from Screen Time. the app uses them to estimate how many minutes you saved each time you walked away or rage-quit.
          </AppText>
        </View>

        {/* How to find on iPhone */}
        <Card style={styles.howCard}>
          <AppText variant="caption" style={styles.howTitle}>where to find this on your iPhone:</AppText>
          <AppText variant="caption" style={styles.howStep}>1. open Settings → Screen Time</AppText>
          <AppText variant="caption" style={styles.howStep}>2. tap "See All Activity" under your daily average</AppText>
          <AppText variant="caption" style={styles.howStep}>3. make sure the toggle at the top is set to "Week"</AppText>
          <AppText variant="caption" style={styles.howStep}>4. scroll to "Most Used" — each app shows weekly minutes and pickups</AppText>
          <AppText variant="caption" style={styles.howStep}>5. enter those numbers below</AppText>
        </Card>

        {/* How the math works */}
        <Card style={styles.explainCard}>
          <AppText variant="caption" style={styles.explainTitle}>how minutes saved is calculated:</AppText>
          <AppText variant="caption" style={styles.explainText}>
            first, we figure out your average session length:{'\n'}
            <AppText style={styles.explainMono}>weekly minutes ÷ weekly pickups</AppText>
          </AppText>
          <AppText variant="caption" style={styles.explainText}>
            then, every time you walk away or rage-quit, we count that as one session you didn't spend in the app.
          </AppText>
          <View style={styles.exampleBox}>
            <AppText variant="caption" style={styles.exampleLabel}>example</AppText>
            <AppText variant="caption" style={styles.exampleText}>
              210 min/week ÷ 30 pickups = 7 min per session{'\n'}
              5 walk-aways this week = ~35 minutes saved
            </AppText>
          </View>
          <AppText variant="caption" style={styles.explainNote}>
            "opened anyway" sessions don't count — you spent that time in the app.
          </AppText>
        </Card>

        {/* App rows */}
        {allApps.map((app) => {
          const est = estimates[app.id] ?? {};
          const isCustom = !ALL_APPS.find((a) => a.id === app.id);
          const avgSession =
            est.weeklyPickups > 0 && est.weeklyMinutes > 0
              ? Math.round((est.weeklyMinutes / est.weeklyPickups) * 10) / 10
              : null;

          return (
            <View key={app.id} style={styles.appBlock}>
              <View style={styles.appHeader}>
                <AppText variant="base">{app.emoji}  {app.label}</AppText>
                <View style={styles.appHeaderRight}>
                  {avgSession !== null && (
                    <AppText variant="caption" style={styles.avgLabel}>
                      ~{avgSession} min average session
                    </AppText>
                  )}
                  {isCustom && (
                    <TouchableOpacity onPress={() => handleRemoveCustomApp(app.id)}>
                      <AppText variant="caption" style={styles.removeBtn}>remove</AppText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <AppText variant="caption" style={styles.inputLabel}>pickups this week</AppText>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={est.weeklyPickups > 0 ? String(est.weeklyPickups) : ''}
                    placeholder="0"
                    placeholderTextColor={colors.textDisabled}
                    onChangeText={(v) => handleChange(app.id, 'weeklyPickups', v)}
                    maxLength={4}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <AppText variant="caption" style={styles.inputLabel}>minutes this week</AppText>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={est.weeklyMinutes > 0 ? String(est.weeklyMinutes) : ''}
                    placeholder="0"
                    placeholderTextColor={colors.textDisabled}
                    onChangeText={(v) => handleChange(app.id, 'weeklyMinutes', v)}
                    maxLength={4}
                  />
                </View>
              </View>
            </View>
          );
        })}

        {/* Add custom app */}
        <View style={styles.addBlock}>
          <AppText variant="caption" style={styles.addLabel}>don't see your app? add it:</AppText>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, styles.addInput]}
              value={newAppName}
              onChangeText={setNewAppName}
              placeholder="app name (e.g. BeReal)"
              placeholderTextColor={colors.textDisabled}
              onSubmitEditing={handleAddApp}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addBtn, !newAppName.trim() && styles.addBtnDisabled]}
              onPress={handleAddApp}
              disabled={!newAppName.trim()}
            >
              <AppText variant="base" style={styles.addBtnText}>add</AppText>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll:       { paddingBottom: spacing.xxl, gap: spacing.md },
  header:       { marginTop: spacing.xl, gap: spacing.sm },
  backBtn:      { alignSelf: 'flex-start' },
  backText:     { color: colors.primary },
  subtitle:     { color: colors.textSub, lineHeight: 22 },

  howCard:      { gap: spacing.xs },
  howTitle:     { color: colors.text, marginBottom: spacing.xs },
  howStep:      { color: colors.textSub, lineHeight: 20 },

  explainCard:  { gap: spacing.sm },
  explainTitle: { color: colors.text, marginBottom: spacing.xs },
  explainText:  { color: colors.textSub, lineHeight: 20 },
  explainMono:  { color: colors.text, fontStyle: 'italic' },
  exampleBox: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
  exampleLabel: { color: colors.primary },
  exampleText:  { color: colors.textSub, lineHeight: 20 },
  explainNote:  { color: colors.textDisabled, lineHeight: 18 },

  appBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  appHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  appHeaderRight: { alignItems: 'flex-end', gap: spacing.xs },
  avgLabel:       { color: colors.primary },
  removeBtn:      { color: colors.danger },

  inputRow:     { flexDirection: 'row', gap: spacing.md },
  inputGroup:   { flex: 1, gap: spacing.xs },
  inputLabel:   { color: colors.textDisabled },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 16,
  },

  addBlock:       { gap: spacing.sm },
  addLabel:       { color: colors.textDisabled },
  addRow:         { flexDirection: 'row', gap: spacing.sm },
  addInput:       { flex: 1 },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText:     { color: '#fff', fontWeight: '600' },
});
