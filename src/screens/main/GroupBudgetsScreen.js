import { useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import { getSettings, saveSettings } from '../../utils/storage';
import { APP_BY_ID } from '../../utils/appCategories';
import { colors, spacing, radius } from '../../theme';

function formatLimit(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function GroupBudgetsScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading]  = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSettings().then((s) => {
        if (!active) return;
        setGroups(s.groupBudgets ?? []);
        setLoading(false);
      });
      return () => { active = false; };
    }, [])
  );

  async function deleteGroup(id) {
    const next = groups.filter((g) => g.id !== id);
    setGroups(next);
    await saveSettings({ groupBudgets: next });
  }

  if (loading) return <ScreenWrapper />;

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
          <AppText variant="caption" style={styles.backText}>‹ settings</AppText>
        </TouchableOpacity>

        <View style={styles.header}>
          <AppText variant="xxl">group budgets</AppText>
          <AppText variant="caption" style={styles.subtitle}>
            set a daily time cap across any mix of apps — friction fires when the pool runs out
          </AppText>
        </View>

        <View style={styles.comingSoonBanner}>
          <AppText variant="caption" style={styles.comingSoonText}>
            ⏳  enforcement requires mac build — configure now, activates later
          </AppText>
        </View>

        {groups.length === 0 ? (
          <Card style={styles.emptyCard}>
            <AppText variant="caption" style={styles.emptyText}>
              no groups yet — add one below
            </AppText>
          </Card>
        ) : (
          <View style={styles.groupList}>
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onEdit={() => navigation.navigate('GroupEdit', { group })}
                onDelete={() => deleteGroup(group.id)}
              />
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('GroupEdit', { group: null })}
        >
          <AppText variant="base" style={styles.addButtonText}>+  add group</AppText>
        </TouchableOpacity>

      </ScrollView>
    </ScreenWrapper>
  );
}

function GroupCard({ group, onEdit, onDelete }) {
  const apps = (group.appIds ?? [])
    .map((id) => APP_BY_ID[id])
    .filter(Boolean);

  return (
    <Card style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <View style={styles.groupTitleRow}>
          <AppText variant="subheading">{group.name}</AppText>
          <View style={styles.limitBadge}>
            <AppText variant="caption" style={styles.limitBadgeText}>
              {formatLimit(group.limitMinutes)} / day
            </AppText>
          </View>
        </View>

        {apps.length > 0 ? (
          <View style={styles.appChips}>
            {apps.map((app) => (
              <View key={app.id} style={styles.appChip}>
                <AppText variant="caption">{app.emoji}  {app.label}</AppText>
              </View>
            ))}
          </View>
        ) : (
          <AppText variant="caption" style={styles.noAppsText}>no apps added yet</AppText>
        )}

        {/* Usage bar — placeholder until DeviceActivityMonitor (task #20) */}
        <View style={styles.usageSection}>
          <View style={styles.usageBarTrack}>
            <View style={[styles.usageBarFill, { width: '0%' }]} />
          </View>
          <AppText variant="caption" style={styles.usageLabel}>
            0 / {formatLimit(group.limitMinutes)} used today — tracking needs mac build
          </AppText>
        </View>
      </View>

      <View style={styles.groupActions}>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <AppText variant="caption" style={styles.editButtonText}>edit</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <AppText variant="caption" style={styles.deleteButtonText}>delete</AppText>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll:       { paddingBottom: spacing.xxl, gap: spacing.lg },
  backRow:      { marginTop: spacing.md },
  backText:     { color: colors.primary },
  header:       { gap: spacing.xs },
  subtitle:     { color: colors.textSub },
  comingSoonBanner: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  comingSoonText: { color: colors.primary },

  emptyCard:    { alignItems: 'center', paddingVertical: spacing.xl },
  emptyText:    { color: colors.textDisabled, fontStyle: 'italic' },

  groupList:    { gap: spacing.md },
  groupCard:    { gap: spacing.md },
  groupHeader:  { gap: spacing.sm },
  groupTitleRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  limitBadge: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  limitBadgeText: { color: colors.primary },

  appChips:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  appChip: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noAppsText:   { color: colors.textDisabled, fontStyle: 'italic' },

  usageSection:   { gap: 6 },
  usageBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  usageLabel:   { color: colors.textDisabled, fontStyle: 'italic' },

  groupActions: { flexDirection: 'row', gap: spacing.sm },
  editButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editButtonText:   { color: colors.text },
  deleteButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteButtonText: { color: colors.danger },

  addButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addButtonText: { color: colors.primary },
});
