// FrictionMaxxingNative.js
// JS bridge to FrictionMaxxingModule (Swift).
// All functions no-op gracefully on Android or pre-Mac builds so the
// app still runs on Chromebook / Expo Go without crashing.

import { requireNativeModule } from 'expo-modules-core';

let NativeModule = null;

try {
  NativeModule = requireNativeModule('FrictionMaxxing');
} catch {
  // Not available in Expo Go or on Android — safe fallback
}

const FrictionMaxxingNative = {

  // ── Authorization ───────────────────────────────────────────────

  /** Show the iOS FamilyControls permission prompt.
   *  Returns { granted: boolean, error?: string } */
  requestAuthorization: async () => {
    if (!NativeModule) return { granted: false, error: 'Native module not available' };
    return NativeModule.requestAuthorization();
  },

  /** Returns 'approved' | 'denied' | 'notDetermined' */
  getAuthorizationStatus: () => {
    if (!NativeModule) return 'notDetermined';
    return NativeModule.getAuthorizationStatus();
  },

  // ── Settings sync ───────────────────────────────────────────────

  /**
   * Push current settings to the App Group so extensions can read them.
   * Call this on app launch and whenever settings change.
   *
   * @param {Object} settings
   * @param {string[]} [settings.gatedApps]            bundle IDs
   * @param {boolean}  [settings.lockoutMode]
   * @param {number}   [settings.lockoutWindowMinutes]
   * @param {boolean}  [settings.dailyTimerEnabled]
   * @param {number}   [settings.dailyTimerMinutes]
   * @param {string}   [settings.difficulty]            'easy'|'medium'|'hard'
   */
  syncSettings: (settings) => {
    if (!NativeModule) return;
    NativeModule.syncSettings(settings);
  },

  // ── Monitoring (daily timer enforcement) ───────────────────────

  /**
   * Start DeviceActivity monitoring so the extension auto-locks gated apps
   * when they exceed the daily timer.
   *
   * @param {string[]} apps         bundle IDs to monitor
   * @param {number}   dailyMinutes per-app daily cap before lockout
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  startMonitoring: async (apps, dailyMinutes) => {
    if (!NativeModule) return { success: false, error: 'Native module not available' };
    return NativeModule.startMonitoring(apps, dailyMinutes);
  },

  /** Stop all DeviceActivity monitoring. */
  stopMonitoring: () => {
    if (!NativeModule) return;
    NativeModule.stopMonitoring();
  },

  // ── Friction group shields ─────────────────────────────────────

  /**
   * Gray out apps on the home screen (iOS "time limit reached" appearance).
   * Apps are still tappable — tapping fires ShieldActionExtension → deep link → GameScreen.
   * Call this whenever group budgets change, and on every launch.
   * @param {string[]} bundleIds
   */
  shieldApps: (bundleIds) => {
    if (!NativeModule) return;
    NativeModule.shieldApps(bundleIds);
  },

  /** Remove all shields (call when an app is removed from every group). */
  unshieldAll: () => {
    if (!NativeModule) return;
    NativeModule.unshieldAll();
  },

  // ── Lockout mode ───────────────────────────────────────────────

  /**
   * Hard-block apps via ManagedSettings (lockout mode).
   * Users will see a system shield when they try to open a blocked app.
   * @param {string[]} bundleIds
   */
  blockApps: (bundleIds) => {
    if (!NativeModule) return;
    NativeModule.blockApps(bundleIds);
  },

  /** Remove all ManagedSettings blocks. */
  unblockAll: () => {
    if (!NativeModule) return;
    NativeModule.unblockAll();
  },

  /**
   * Unblock a single app for a timed window, then re-lock it.
   * Call this after the user beats a game in lockout mode.
   *
   * @param {string} bundleId
   * @param {number} minutes   unlock window length
   * @returns {Promise<{ success: boolean }>}  resolves when window closes and app re-locks
   */
  unlockForWindow: async (bundleId, minutes) => {
    if (!NativeModule) return { success: false };
    return NativeModule.unlockForWindow(bundleId, minutes);
  },
};

export default FrictionMaxxingNative;
