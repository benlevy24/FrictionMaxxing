import { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../../components/ScreenWrapper';
import AppText from '../../components/AppText';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { getSettings, saveSettings } from '../../utils/storage';
import { getCurrentLocation } from '../../utils/location';
import { colors, spacing, radius } from '../../theme';

const RADIUS_OPTIONS = [
  { value: 100,  label: '100m', sublabel: 'exact building' },
  { value: 500,  label: '500m', sublabel: 'my block' },
  { value: 2000, label: '2km',  sublabel: 'my area' },
];

export default function GeoBlockingScreen({ navigation }) {
  const [zones, setZones]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [pendingLocation, setPendingLocation] = useState(null); // { lat, lng }
  const [zoneName, setZoneName]       = useState('');
  const [selectedRadius, setSelectedRadius]   = useState(500);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSettings().then((s) => {
        if (active) {
          setZones(s.freeZones ?? []);
          setLoading(false);
        }
      });
      return () => { active = false; };
    }, [])
  );

  async function handleAddLocation() {
    setFetchingLocation(true);
    const loc = await getCurrentLocation();
    setFetchingLocation(false);

    if (!loc) {
      Alert.alert(
        'location access required',
        'enable location permission in your device settings to add free zones.'
      );
      return;
    }

    setPendingLocation(loc);
    setZoneName('');
    setSelectedRadius(500);
    setAddModalVisible(true);
  }

  async function handleSaveZone() {
    const name = zoneName.trim();
    if (!name) {
      Alert.alert('name required', 'give this place a name.');
      return;
    }

    const newZone = {
      id:           `zone_${Date.now()}`,
      name,
      lat:          pendingLocation.lat,
      lng:          pendingLocation.lng,
      radiusMeters: selectedRadius,
    };

    const next = [...zones, newZone];
    setZones(next);
    await saveSettings({ freeZones: next });
    setAddModalVisible(false);
  }

  async function handleDeleteZone(id) {
    Alert.alert(
      'remove this zone?',
      'blocking will resume here.',
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'remove',
          style: 'destructive',
          onPress: async () => {
            const next = zones.filter((z) => z.id !== id);
            setZones(next);
            await saveSettings({ freeZones: next });
          },
        },
      ]
    );
  }

  if (loading) return <ScreenWrapper />;

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
          <AppText variant="caption" style={styles.backText}>‹ settings</AppText>
        </TouchableOpacity>

        <View style={styles.header}>
          <AppText variant="xxl">free zones</AppText>
          <AppText variant="caption" style={styles.subtitle}>
            blocking pauses when you're in these places
          </AppText>
        </View>

        {zones.length === 0 ? (
          <Card style={styles.emptyCard}>
            <AppText variant="base" style={styles.emptyEmoji}>📍</AppText>
            <AppText variant="base" style={styles.emptyTitle}>no free zones yet</AppText>
            <AppText variant="caption" style={styles.emptyText}>
              add a place (like home) where you don't want friction
            </AppText>
          </Card>
        ) : (
          <Card style={styles.zoneList}>
            {zones.map((zone, i) => (
              <View
                key={zone.id}
                style={[styles.zoneRow, i < zones.length - 1 && styles.zoneRowBorder]}
              >
                <AppText variant="base" style={styles.zoneEmoji}>📍</AppText>
                <View style={styles.zoneInfo}>
                  <AppText variant="base">{zone.name}</AppText>
                  <View style={styles.radiusBadgeRow}>
                    <View style={styles.radiusBadge}>
                      <AppText variant="caption" style={styles.radiusBadgeText}>
                        {zone.radiusMeters >= 1000
                          ? `${zone.radiusMeters / 1000}km`
                          : `${zone.radiusMeters}m`}
                      </AppText>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteZone(zone.id)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <AppText variant="caption" style={styles.deleteText}>✕</AppText>
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        )}

        <Button
          label={fetchingLocation ? 'getting location…' : '+ add current location'}
          variant="primary"
          onPress={handleAddLocation}
          disabled={fetchingLocation}
          style={styles.addButton}
        />

        {fetchingLocation && (
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        )}

      </ScrollView>

      {/* Add Zone Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <AppText variant="subheading" style={styles.modalTitle}>name this place</AppText>

            <TextInput
              style={styles.nameInput}
              placeholder="e.g. Home, Gym, Office"
              placeholderTextColor={colors.textDisabled}
              value={zoneName}
              onChangeText={setZoneName}
              autoFocus
              returnKeyType="done"
            />

            <AppText variant="caption" style={styles.radiusLabel}>radius</AppText>
            <View style={styles.radiusRow}>
              {RADIUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.radiusPill,
                    selectedRadius === opt.value && styles.radiusPillActive,
                  ]}
                  onPress={() => setSelectedRadius(opt.value)}
                >
                  <AppText
                    variant="base"
                    style={[
                      styles.radiusPillLabel,
                      selectedRadius === opt.value && styles.radiusPillLabelActive,
                    ]}
                  >
                    {opt.label}
                  </AppText>
                  <AppText
                    variant="caption"
                    style={[
                      styles.radiusPillSub,
                      selectedRadius === opt.value && styles.radiusPillSubActive,
                    ]}
                  >
                    {opt.sublabel}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <Button label="cancel" variant="secondary" onPress={() => setAddModalVisible(false)} />
              <Button label="save zone" variant="primary" onPress={handleSaveZone} />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll:         { paddingBottom: spacing.xxl, gap: spacing.lg },
  backRow:        { marginTop: spacing.md },
  backText:       { color: colors.primary },
  header:         { gap: spacing.xs },
  subtitle:       { color: colors.textSub, lineHeight: 20 },

  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { color: colors.textSub },
  emptyText:  { textAlign: 'center', color: colors.textDisabled, lineHeight: 20 },

  zoneList:       { padding: 0, overflow: 'hidden' },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  zoneRowBorder:  { borderBottomWidth: 1, borderBottomColor: colors.border },
  zoneEmoji:      { width: 28, textAlign: 'center', fontSize: 18 },
  zoneInfo:       { flex: 1, gap: 4 },
  radiusBadgeRow: { flexDirection: 'row' },
  radiusBadge: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  radiusBadgeText: { color: colors.primary, fontSize: 11 },
  deleteButton:   { padding: spacing.xs },
  deleteText:     { color: colors.textDisabled },

  addButton:      { marginTop: spacing.sm },
  spinner:        { marginTop: spacing.sm },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '100%',
    gap: spacing.md,
  },
  modalTitle:   { marginBottom: spacing.xs },
  nameInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 16,
  },
  radiusLabel:  { color: colors.textSub, marginBottom: -spacing.xs },
  radiusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  radiusPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  radiusPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  radiusPillLabel:       { color: colors.textSub },
  radiusPillLabelActive: { color: colors.primary },
  radiusPillSub:         { color: colors.textDisabled, fontSize: 10 },
  radiusPillSubActive:   { color: colors.primary, opacity: 0.7 },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
