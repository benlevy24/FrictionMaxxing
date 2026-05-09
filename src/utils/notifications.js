// Notification scheduling for time constraint sessions.
//
// Requires expo-notifications to be installed (done) AND a native rebuild to work on device.
// All calls are wrapped in try/catch so the rest of the app degrades gracefully on Chromebook.

export async function scheduleTimeConstraintNotifications(appLabel, durationSeconds) {
  try {
    // Dynamic require avoids a hard crash if native module isn't linked yet
    const Notifications = require('expo-notifications');

    // Cancel any time constraint notifications already scheduled (e.g. from a prior session)
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter((n) => n.content?.data?.isTimeConstraint);
    await Promise.all(
      toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );

    // 15-second heads-up (only if session is long enough to warrant it)
    if (durationSeconds > 20) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'wrapping up ⏱',
          body: `15 seconds left on ${appLabel}.`,
          data: { isTimeConstraint: true },
        },
        trigger: { type: 'timeInterval', seconds: durationSeconds - 15, repeats: false },
      });
    }

    // Time's up
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `time's up on ${appLabel} ⏱`,
        body: 'session over. walk away, or beat a game to keep going.',
        data: { isTimeConstraint: true },
      },
      trigger: { type: 'timeInterval', seconds: durationSeconds, repeats: false },
    });
  } catch {
    // expo-notifications native module not linked — notifications require mac build
  }
}
