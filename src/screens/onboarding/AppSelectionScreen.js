import { useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Button from '../../components/Button';
import { colors, spacing, radius } from '../../theme';

const DEFAULT_APPS = [
  { id: 'instagram', label: 'Instagram', emoji: '📸' },
  { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { id: 'youtube', label: 'YouTube', emoji: '▶️' },
  { id: 'x', label: 'X / Twitter', emoji: '🐦' },
  { id: 'facebook', label: 'Facebook', emoji: '👍' },
  { id: 'snapchat', label: 'Snapchat', emoji: '👻' },
  { id: 'reddit', label: 'Reddit', emoji: '🤖' },
  { id: 'threads', label: 'Threads', emoji: '🧵' },
  { id: 'linkedin', label: 'LinkedIn', emoji: '💼' },
  { id: 'pinterest', label: 'Pinterest', emoji: '📌' },
];

export default function AppSelectionScreen({ navigation }) {
  const [selected, setSelected] = useState(
    new Set(DEFAULT_APPS.slice(0, 7).map((a) => a.id)) // first 7 on by default
  );

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === DEFAULT_APPS.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(DEFAULT_APPS.map((a) => a.id)));
    }
  }

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <AppText variant="xxl" style={styles.title}>pick your apps</AppText>
        <AppText variant="caption">
          these are the ones that'll get gated. be honest with yourself.
        </AppText>
      </View>

      <FlatList
        data={DEFAULT_APPS}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isOn = selected.has(item.id);
          return (
            <TouchableOpacity
              style={[styles.row, isOn && styles.rowSelected]}
              onPress={() => toggle(item.id)}
              activeOpacity={0.7}
            >
              <AppText variant="lg" style={styles.emoji}>{item.emoji}</AppText>
              <AppText variant="base" style={styles.rowLabel}>{item.label}</AppText>
              <View style={[styles.check, isOn && styles.checkOn]}>
                {isOn && <AppText variant="xs" style={styles.checkMark}>✓</AppText>}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.footer}>
        <Button
          label={selected.size === DEFAULT_APPS.length ? 'deselect all' : 'select all'}
          variant="ghost"
          onPress={toggleAll}
          style={styles.toggleAll}
        />
        <Button
          label={selected.size === 0 ? 'skip for now' : `add friction to ${selected.size} app${selected.size === 1 ? '' : 's'}`}
          onPress={() => navigation.navigate('Permissions')}
          disabled={false}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    marginBottom: spacing.xs,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  emoji: {
    width: 28,
    textAlign: 'center',
  },
  rowLabel: {
    flex: 1,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  toggleAll: {
    alignSelf: 'center',
  },
});
