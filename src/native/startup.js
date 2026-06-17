// startup.js
// Called once on app launch from RootNavigator.
// Checks FamilyControls authorization status, syncs settings to the App Group
// so the DeviceActivity and ShieldAction extensions have fresh data, and
// starts DeviceActivity monitoring if the daily timer is enabled.
//
// Safe to call on every launch — all operations are idempotent.

import FrictionMaxxingNative from './FrictionMaxxingNative';
import { getSettings, saveSettings, APP_BUNDLE_IDS, ALL_APPS } from '../utils/storage';

export async function initNative() {
  try {
    const settings = await getSettings();

    // Check current auth status — if approved, flip the flag in settings
    const status = FrictionMaxxingNative.getAuthorizationStatus();
    if (status === 'approved' && !settings.screenTimePermissionGranted) {
      await saveSettings({ screenTimePermissionGranted: true });
    }

    // Collect bundle IDs for all gated apps (built-in + custom)
    // Custom apps may not have a bundle ID entry — they're excluded from native monitoring
    const allAppIds = [
      ...ALL_APPS.map((a) => a.id),
      ...(settings.customApps ?? []).map((a) => a.id),
    ].filter((id) => !( settings.hiddenAppIds ?? []).includes(id));

    const gatedBundleIds = allAppIds
      .map((id) => APP_BUNDLE_IDS[id])
      .filter(Boolean);

    // Push settings into App Group storage so extensions can read them
    FrictionMaxxingNative.syncSettings({
      gatedApps:            gatedBundleIds,
      lockoutMode:          settings.frictionMode === 'lockout',
      lockoutWindowMinutes: settings.lockoutWindowMinutes ?? 1,
      dailyTimerEnabled:    settings.dailyUsageTimer?.enabled ?? false,
      dailyTimerMinutes:    settings.dailyUsageTimer?.minutes ?? 30,
      difficulty:           settings.difficulty ?? 'medium',
    });

    // Shield all apps that are in any group budget (grays them out on home screen)
    await syncShieldedApps(settings);

    // Start DeviceActivity monitoring if daily timer is on and we have authorization
    if (status === 'approved' && settings.dailyUsageTimer?.enabled && gatedBundleIds.length > 0) {
      await FrictionMaxxingNative.startMonitoring(
        gatedBundleIds,
        settings.dailyUsageTimer.minutes
      );
    }
  } catch {
    // Never crash the app on native init failure — just log and continue
    if (__DEV__) console.warn('[FrictionMaxxing] initNative failed silently');
  }
}

// Collect all apps in any group budget and shield them on the home screen.
// Call this on launch and whenever group budgets change.
export async function syncShieldedApps(settings) {
  try {
    const s = settings ?? (await getSettings());
    const groupAppIds = (s.groupBudgets ?? []).flatMap((g) => g.appIds ?? []);
    const uniqueIds = [...new Set(groupAppIds)];
    const bundleIds = uniqueIds.map((id) => APP_BUNDLE_IDS[id]).filter(Boolean);

    if (bundleIds.length > 0) {
      FrictionMaxxingNative.shieldApps(bundleIds);
    } else {
      FrictionMaxxingNative.unshieldAll();
    }
  } catch {
    if (__DEV__) console.warn('[FrictionMaxxing] syncShieldedApps failed silently');
  }
}

// Call after the user grants FamilyControls permission during onboarding.
// Requests authorization and updates the screenTimePermissionGranted flag.
export async function requestScreenTimePermission() {
  const result = await FrictionMaxxingNative.requestAuthorization();
  if (result.granted) {
    await saveSettings({ screenTimePermissionGranted: true });
    // Re-run init now that we have permission
    await initNative();
  }
  return result;
}
