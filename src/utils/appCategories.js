// Apps organized by iOS App Library category — used as a browsing aid in the group budget picker.
// Category is purely for UI navigation; a group can mix apps from any category.

export const APPS_BY_CATEGORY = [
  {
    id: 'social',
    label: 'Social',
    emoji: '💬',
    apps: [
      { id: 'instagram', label: 'Instagram',   emoji: '📸' },
      { id: 'tiktok',    label: 'TikTok',      emoji: '🎵' },
      { id: 'x',         label: 'X / Twitter', emoji: '🐦' },
      { id: 'facebook',  label: 'Facebook',    emoji: '👍' },
      { id: 'snapchat',  label: 'Snapchat',    emoji: '👻' },
      { id: 'threads',   label: 'Threads',     emoji: '🧵' },
      { id: 'linkedin',  label: 'LinkedIn',    emoji: '💼' },
      { id: 'pinterest', label: 'Pinterest',   emoji: '📌' },
      { id: 'reddit',    label: 'Reddit',      emoji: '🤖' },
      { id: 'discord',   label: 'Discord',     emoji: '🎙️' },
      { id: 'bereal',    label: 'BeReal',      emoji: '📷' },
    ],
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    emoji: '🎬',
    apps: [
      { id: 'youtube',  label: 'YouTube',   emoji: '▶️' },
      { id: 'netflix',  label: 'Netflix',   emoji: '🎥' },
      { id: 'twitch',   label: 'Twitch',    emoji: '📺' },
      { id: 'disney',   label: 'Disney+',   emoji: '🏰' },
      { id: 'hulu',     label: 'Hulu',      emoji: '📺' },
      { id: 'appletv',  label: 'Apple TV+', emoji: '🍎' },
      { id: 'peacock',  label: 'Peacock',   emoji: '🦚' },
    ],
  },
  {
    id: 'messaging',
    label: 'Messaging',
    emoji: '💬',
    apps: [
      { id: 'messages',  label: 'Messages',  emoji: '💬' },
      { id: 'whatsapp',  label: 'WhatsApp',  emoji: '📱' },
      { id: 'telegram',  label: 'Telegram',  emoji: '✈️' },
      { id: 'signal',    label: 'Signal',    emoji: '🔒' },
      { id: 'messenger', label: 'Messenger', emoji: '💙' },
    ],
  },
  {
    id: 'music',
    label: 'Music',
    emoji: '🎧',
    apps: [
      { id: 'spotify',      label: 'Spotify',       emoji: '🟢' },
      { id: 'applemusic',   label: 'Apple Music',   emoji: '🎵' },
      { id: 'youtubemusic', label: 'YouTube Music', emoji: '🎶' },
      { id: 'soundcloud',   label: 'SoundCloud',    emoji: '☁️' },
    ],
  },
  {
    id: 'productivity',
    label: 'Productivity',
    emoji: '✅',
    apps: [
      { id: 'slack',    label: 'Slack',         emoji: '💬' },
      { id: 'notion',   label: 'Notion',        emoji: '📝' },
      { id: 'gmail',    label: 'Gmail',         emoji: '📧' },
      { id: 'outlook',  label: 'Outlook',       emoji: '📨' },
      { id: 'chatgpt',  label: 'ChatGPT',       emoji: '🧠' },
      { id: 'calendar', label: 'Calendar',      emoji: '📅' },
      { id: 'reminders',label: 'Reminders',     emoji: '🔔' },
    ],
  },
  {
    id: 'shopping',
    label: 'Shopping',
    emoji: '🛍️',
    apps: [
      { id: 'amazon',    label: 'Amazon',    emoji: '📦' },
      { id: 'ebay',      label: 'eBay',      emoji: '🏷️' },
      { id: 'etsy',      label: 'Etsy',      emoji: '🧶' },
      { id: 'shein',     label: 'SHEIN',     emoji: '👗' },
      { id: 'instacart', label: 'Instacart', emoji: '🛒' },
    ],
  },
  {
    id: 'news',
    label: 'News',
    emoji: '📰',
    apps: [
      { id: 'applenews', label: 'Apple News',      emoji: '📰' },
      { id: 'cnn',       label: 'CNN',             emoji: '📡' },
      { id: 'nyt',       label: 'NY Times',        emoji: '🗞️' },
      { id: 'wapo',      label: 'Washington Post', emoji: '📄' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    emoji: '💳',
    apps: [
      { id: 'venmo',      label: 'Venmo',     emoji: '💸' },
      { id: 'cashapp',    label: 'Cash App',  emoji: '💵' },
      { id: 'robinhood',  label: 'Robinhood', emoji: '📈' },
      { id: 'coinbase',   label: 'Coinbase',  emoji: '🪙' },
    ],
  },
  {
    id: 'games',
    label: 'Games',
    emoji: '🎮',
    apps: [
      { id: 'wordle',   label: 'Wordle',    emoji: '🟩' },
      { id: 'candy',    label: 'Candy Crush', emoji: '🍬' },
      { id: 'clash',    label: 'Clash of Clans', emoji: '⚔️' },
      { id: 'roblox',   label: 'Roblox',    emoji: '🧱' },
      { id: 'duolingo', label: 'Duolingo',  emoji: '🦜' },
    ],
  },
  {
    id: 'health',
    label: 'Health & Fitness',
    emoji: '🏃',
    apps: [
      { id: 'health',      label: 'Health',       emoji: '❤️' },
      { id: 'strava',      label: 'Strava',       emoji: '🚴' },
      { id: 'myfitnesspal',label: 'MyFitnessPal', emoji: '🥗' },
      { id: 'calm',        label: 'Calm',         emoji: '🧘' },
      { id: 'headspace',   label: 'Headspace',    emoji: '🌤️' },
    ],
  },
  {
    id: 'utilities',
    label: 'Utilities',
    emoji: '🔧',
    apps: [
      { id: 'safari',  label: 'Safari',   emoji: '🧭' },
      { id: 'chrome',  label: 'Chrome',   emoji: '🌐' },
      { id: 'camera',  label: 'Camera',   emoji: '📷' },
      { id: 'photos',  label: 'Photos',   emoji: '🖼️' },
      { id: 'maps',    label: 'Maps',     emoji: '🗺️' },
    ],
  },
];

// Flat lookup: appId → { id, label, emoji }
export const APP_BY_ID = {};
for (const cat of APPS_BY_CATEGORY) {
  for (const app of cat.apps) {
    APP_BY_ID[app.id] = app;
  }
}
