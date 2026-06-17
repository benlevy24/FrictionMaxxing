import { useState } from 'react';
import {
  View, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import { getSettings, saveSettings } from '../../utils/storage';
import { syncShieldedApps } from '../../native/startup';
import { APPS_BY_CATEGORY } from '../../utils/appCategories';
import { colors, spacing, radius } from '../../theme';

const LIMIT_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240];

function formatLimit(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function GroupEditScreen({ route, navigation }) {
  const existing = route.params?.group ?? null;

  const [name, setName]               = useState(existing?.name ?? '');
  const [limitMinutes, setLimitMinutes] = useState(existing?.limitMinutes ?? 30);
  const [selectedIds, setSelectedIds]  = useState(new Set(existing?.appIds ?? []));
  const [expandedCats, setExpandedCats] = useState(new Set());
  const [saving, setSaving]            = useState(false);

  function cycleLimit(direction) {
    const idx     = LIMIT_OPTIONS.indexOf(limitMinutes);
    const safeIdx = idx === -1 ? LIMIT_OPTIONS.indexOf(30) : idx;
    const nextIdx = (safeIdx + direction + LIMIT_OPTIONS.length) % LIMIT_OPTIONS.length;
    setLimitMinutes(LIMIT_OPTIONS[nextIdx]);
  }

  function toggleApp(appId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  }

  function toggleCategory(catId) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('name required', 'give the group a name so you can tell them apart');
      return;
    }
    if (selectedIds.size === 0) {
      Alert.alert('no apps selected', 'pick at least one app to track');
      return;
    }

    setSaving(true);
    const settings = await getSettings();
    const current  = settings.groupBudgets ?? [];

    const entry = {
      id:           existing?.id ?? `grp_${Date.now()}`,
      name:         name.trim(),
      limitMinutes,
      appIds:       [...selectedIds],
    };

    const next = existing
      ? current.map((g) => (g.id === existing.id ? entry : g))
      : [...current, entry];

    await saveSettings({ groupBudgets: next });
    await syncShieldedApps();
    setSaving(false);
    navigation.goBack();
  }

  async function handleDelete() {
    Alert.alert(
      `delete "${existing.name}"?`,
      'removes this group and its time limit.',
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'delete',
          style: 'destructive',
          onPress: async () => {
            const settings = await getSettings();
            const next = (settings.groupBudgets ?? []).filter((g) => g.id !== existing.id);
            await saveSettings({ groupBudgets: next });
            await syncShieldedApps();
            navigation.goBack();
          },
        },
      ]
    );
  }

  const selectedCount = selectedIds.size;

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
          <AppText variant="caption" style={styles.backText}>‹ back</AppText>
        </TouchableOpacity>

        <View style={styles.header}>
          <AppText variant="xxl">{existing ? 'edit group' : 'new group'}</AppText>
        </View>

        {/* Name */}
        <View style={styles.section}>
          <AppText variant="subheading">name</AppText>
          <Card style={styles.inputCard}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. doom scrolling, social media…"
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="none"
              maxLength={40}
            />
          </Card>
        </View>

        {/* Time limit */}
        <View style={styles.section}>
          <AppText variant="subheading">daily time limit</AppText>
          <Card style={styles.limitCard}>
            <View style={styles.limitRow}>
              <TouchableOpacity
                onPress={() => cycleLimit(-1)}
                style={styles.arrow}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <AppText style={styles.arrowText}>‹</AppText>
              </TouchableOpacity>
              <View style={styles.limitDisplay}>
                <AppText variant="subheading" style={styles.limitText}>
                  {formatLimit(limitMinutes)}
                </AppText>
              </View>
              <TouchableOpacity
                onPress={() => cycleLimit(1)}
                style={styles.arrow}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <AppText style={styles.arrowText}>›</AppText>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* App picker */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <AppText variant="subheading">apps</AppText>
            {selectedCount > 0 && (
              <AppText variant="caption" style={styles.selectedCount}>
                {selectedCount} selected
              </AppText>
            )}
          </View>
          <AppText variant="caption" style={styles.pickerHint}>
            mix and match from any category — the budget is shared across all selected apps
          </AppText>

          <Card style={styles.pickerCard}>
            {APPS_BY_CATEGORY.map((cat, catIdx) => {
              const isExpanded = expandedCats.has(cat.id);
              const selectedInCat = cat.apps.filter((a) => selectedIds.has(a.id)).length;
              const isLast = catIdx === APPS_BY_CATEGORY.length - 1;

              return (
                <View key={cat.id}>
                  <TouchableOpacity
                    style={[styles.catRow, !isExpanded && !isLast && styles.catRowBorder]}
                    onPress={() => toggleCategory(cat.id)}
                  >
                    <AppText variant="base" style={styles.catEmoji}>{cat.emoji}</AppText>
                    <AppText variant="base" style={styles.catLabel}>{cat.label}</AppText>
                    {selectedInCat > 0 && (
                      <View style={styles.catBadge}>
                        <AppText variant="caption" style={styles.catBadgeText}>
                          {selectedInCat}
                        </AppText>
                      </View>
                    )}
                    <AppText variant="caption" style={styles.catChevron}>
                      {isExpanded ? '∨' : '›'}
                    </AppText>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={[styles.appList, !isLast && styles.appListBorder]}>
                      {cat.apps.map((app, appIdx) => {
                        const selected = selectedIds.has(app.id);
                        const isLastApp = appIdx === cat.apps.length - 1;
                        return (
                          <TouchableOpacity
                            key={app.id}
                            style={[styles.appRow, !isLastApp && styles.appRowBorder]}
                            onPress={() => toggleApp(app.id)}
                          >
                            <AppText variant="base" style={styles.appEmoji}>{app.emoji}</AppText>
                            <AppText variant="base" style={styles.appLabel}>{app.label}</AppText>
                            <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                              {selected && <AppText style={styles.checkmark}>✓</AppText>}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </Card>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <AppText variant="base" style={styles.saveButtonText}>
            {saving ? 'saving…' : existing ? 'save changes' : 'create group'}
          </AppText>
        </TouchableOpacity>

        {existing && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <AppText variant="base" style={styles.deleteButtonText}>delete group</AppText>
          </TouchableOpacity>
        )}

      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll:       { paddingBottom: spacing.xxl, gap: spacing.lg },
  backRow:      { marginTop: spacing.md },
  backText:     { color: colors.primary },
  header:       {},

  section:         { gap: spacing.sm },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  selectedCount:   { color: colors.primary },
  pickerHint:      { color: colors.textSub },

  inputCard:    { padding: 0 },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontFamily: 'Comic Sans MS',
    fontSize: 15,
  },

  limitCard:    { padding: spacing.md },
  limitRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  arrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  arrowText:    { fontSize: 20, color: colors.text, lineHeight: 24 },
  limitDisplay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  limitText:    { color: colors.primary },

  pickerCard:   { padding: 0, overflow: 'hidden' },

  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  catRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  catEmoji:     { width: 24, textAlign: 'center' },
  catLabel:     { flex: 1 },
  catBadge: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  catBadgeText: { color: colors.primary },
  catChevron:   { color: colors.textSub, width: 16, textAlign: 'center' },

  appList:       { backgroundColor: colors.surfaceRaised },
  appListBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  appRowBorder:  { borderBottomWidth: 1, borderBottomColor: colors.border },
  appEmoji:      { width: 24, textAlign: 'center' },
  appLabel:      { flex: 1 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: { color: colors.bg, fontSize: 13, fontWeight: 'bold' },

  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText:     { color: colors.bg },

  deleteButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteButtonText: { color: colors.danger },
});
