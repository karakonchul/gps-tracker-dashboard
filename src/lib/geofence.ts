export function isInsideGeofence(lat: number, lng: number, centerLat: number, centerLng: number, radiusKm: number): boolean {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(centerLat - lat);
    const dLng = toRad(centerLng - lng);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat)) * Math.cos(toRad(centerLat)) *
              Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance <= radiusKm;
  }
  