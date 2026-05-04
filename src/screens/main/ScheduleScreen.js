import { useState, useCallback } from 'react';
import { View, ScrollView, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import { getSettings, saveSettings } from '../../utils/storage';
import { colors, spacing, radius } from '../../theme';

const DAYS = [
  { index: 0, short: 'Su' },
  { index: 1, short: 'Mo' },
  { index: 2, short: 'Tu' },
  { index: 3, short: 'We' },
  { index: 4, short: 'Th' },
  { index: 5, short: 'Fr' },
  { index: 6, short: 'Sa' },
];

function formatHour(h) {
  if (h === 0)  return '12 AM';
  if (h < 12)   return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function daysSummary(activeDays) {
  if (activeDays.length === 7) return 'every day';
  if (activeDays.length === 0) return 'no days selected';
  const weekdays = [1,2,3,4,5];
  const weekend  = [0,6];
  const isWeekdays = weekdays.every((d) => activeDays.includes(d)) && activeDays.length === 5;
  const isWeekend  = weekend.every((d) => activeDays.includes(d)) && activeDays.length === 2;
  if (isWeekdays) return 'weekdays only';
  if (isWeekend)  return 'weekends only';
  return activeDays.map((d) => DAYS[d].short).join(', ');
}

function HourPicker({ label, value, onChange }) {
  function adjust(delta) {
    onChange((value + delta + 24) % 24);
  }
  return (
    <View style={styles.pickerRow}>
      <AppText variant="caption" style={styles.pickerLabel}>{label}</AppText>
      <View style={styles.pickerControls}>
        <TouchableOpacity onPress={() => adjust(-1)} style={styles.arrow} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppText style={styles.arrowText}>‹</AppText>
        </TouchableOpacity>
        <View style={styles.hourDisplay}>
          <AppText variant="subheading" style={styles.hourText}>{formatHour(value)}</AppText>
        </View>
        <TouchableOpacity onPress={() => adjust(1)} style={styles.arrow} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppText style={styles.arrowText}>›</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ScheduleScreen({ navigation }) {
  const [enabled,    setEnabled]    = useState(false);
  const [startHour,  setStartHour]  = useState(8);
  const [endHour,    setEndHour]    = useState(17);
  const [activeDays, setActiveDays] = useState([0,1,2,3,4,5,6]);
  const [loading,    setLoading]    = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSettings().then((s) => {
        if (!active) return;
        const sb = s.scheduleBlock ?? {};
        setEnabled(sb.enabled    ?? false);
        setStartHour(sb.startHour  ?? 8);
        setEndHour(sb.endHour    ?? 17);
        setActiveDays(sb.activeDays ?? [0,1,2,3,4,5,6]);
        setLoading(false);
      });
      return () => { active = false; };
    }, [])
  );

  async function persist(patch) {
    const next = { enabled, startHour, endHour, activeDays, ...patch };
    await saveSettings({ scheduleBlock: next });
  }

  async function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    await persist({ enabled: next });
  }

  async function handleStartHour(h) {
    setStartHour(h);
    await persist({ startHour: h });
  }

  async function handleEndHour(h) {
    setEndHour(h);
    await persist({ endHour: h });
  }

  async function handleToggleDay(dayIndex) {
    const isOn = activeDays.includes(dayIndex);
    // must keep at least one day active
    if (isOn && activeDays.length === 1) return;
    const next = isOn
      ? activeDays.filter((d) => d !== dayIndex)
      : [...activeDays, dayIndex].sort((a, b) => a - b);
    setActiveDays(next);
    await persist({ activeDays: next });
  }

  function windowSummary() {
    const days = daysSummary(activeDays);
    const timeRange = startHour === endHour
      ? 'all day'
      : startHour < endHour
        ? `${formatHour(startHour)} – ${formatHour(endHour)}`
        : `${formatHour(startHour)} – ${formatHour(endHour)} (overnight)`;
    return `friction on ${days}, ${timeRange}`;
  }

  if (loading) return <ScreenWrapper />;

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
          <AppText variant="caption" style={styles.backText}>‹ settings</AppText>
        </TouchableOpacity>

        <View style={styles.header}>
          <AppText variant="xxl">schedule</AppText>
          <AppText variant="caption" style={styles.subtitle}>
            limit friction to certain days and hours
          </AppText>
        </View>

        {/* Enable toggle */}
        <Card style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <AppText variant="base">active schedule only</AppText>
              <AppText variant="caption" style={styles.toggleSub}>
                outside this schedule, apps open freely
              </AppText>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.text}
            />
          </View>
        </Card>

        {/* Day picker */}
        <Card style={[styles.pickerCard, !enabled && styles.pickerCardDisabled]}>
          <View style={styles.pickerRow}>
            <AppText variant="caption" style={styles.pickerLabel}>active days</AppText>
            <View style={styles.dayRow}>
              {DAYS.map(({ index, short }) => {
                const active = activeDays.includes(index);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.dayPill, active && styles.dayPillActive]}
                    onPress={() => enabled && handleToggleDay(index)}
                    activeOpacity={enabled ? 0.7 : 1}
                  >
                    <AppText
                      variant="caption"
                      style={[styles.dayLabel, active && styles.dayLabelActive]}
                    >
                      {short}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Hour pickers */}
          <HourPicker
            label="friction starts"
            value={startHour}
            onChange={enabled ? handleStartHour : () => {}}
          />
          <View style={styles.divider} />
          <HourPicker
            label="friction ends"
            value={endHour}
            onChange={enabled ? handleEndHour : () => {}}
          />
        </Card>

        {enabled && (
          <AppText variant="caption" style={styles.summary}>
            {windowSummary()}
          </AppText>
        )}

        {!enabled && (
          <AppText variant="caption" style={styles.disabledNote}>
            enable above to set your friction schedule
          </AppText>
        )}

      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll:       { paddingBottom: spacing.xxl, gap: spacing.lg },
  backRow:      { marginTop: spacing.md },
  backText:     { color: colors.primary },
  header:       { gap: spacing.xs },
  subtitle:     { color: colors.textSub, lineHeight: 20 },

  toggleCard:   { padding: 0, overflow: 'hidden' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  toggleText:   { flex: 1, gap: 2 },
  toggleSub:    { color: colors.textDisabled },

  pickerCard:         { gap: 0, padding: 0, overflow: 'hidden' },
  pickerCardDisabled: { opacity: 0.4 },

  pickerRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  pickerLabel:    { color: colors.textSub },
  pickerControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  dayRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dayPill: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  dayPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  dayLabel:       { color: colors.textDisabled },
  dayLabelActive: { color: colors.primary },

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
  hourDisplay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  hourText:    { color: colors.primary },

  divider:      { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },
  summary:      { color: colors.primary, textAlign: 'center' },
  disabledNote: { color: colors.textDisabled, textAlign: 'center' },
});
