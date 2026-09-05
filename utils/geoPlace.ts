import type { LocationGeocodedAddress } from 'expo-location';

const COORD_ADDRESS = /^-?\d+\.\d+,\s*-?\d+\.\d+$/;

export function looksLikeCoordinates(value?: string | null) {
  return Boolean(value && COORD_ADDRESS.test(value.trim()));
}

/** Prefer barangay + city (Philippines), then a short fallback. */
export function formatBarangayCity(place: LocationGeocodedAddress): string {
  const barangay = (
    place.district ||
    place.subregion ||
    place.name ||
    ''
  ).trim();
  const city = (place.city || place.subregion || place.region || '').trim();

  if (barangay && city && barangay.toLowerCase() !== city.toLowerCase()) {
    return `${barangay}, ${city}`;
  }
  if (city) return city;
  if (barangay) return barangay;

  return [place.street, place.region].filter(Boolean).join(', ');
}
