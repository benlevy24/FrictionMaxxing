import * as Location from 'expo-location';

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Returns { lat, lng } or null if permission denied / error.
export async function getCurrentLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

// Returns true if current location is inside any saved free zone.
// Fails silently (returns false) on permission denial or location error.
export async function isInFreeZone(freeZones) {
  if (!freeZones?.length) return false;
  const loc = await getCurrentLocation();
  if (!loc) return false;
  return freeZones.some(
    (zone) => getDistanceMeters(loc.lat, loc.lng, zone.lat, zone.lng) <= zone.radiusMeters
  );
}
