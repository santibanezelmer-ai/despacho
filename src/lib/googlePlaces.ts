import { supabase } from '@/integrations/supabase/client';
import type { LocationCandidate } from '@/lib/locationResolver';

export interface PlaceSuggestion {
  placeId: string;
  main: string;
  secondary: string;
  distanceMeters: number | null;
}

/** Un token por interacción de búsqueda; se renueva tras elegir un lugar. */
export const newPlacesSession = () => crypto.randomUUID();

export async function placesAutocomplete(
  input: string,
  sessionToken: string,
  near: { lat: number; lng: number } | null,
): Promise<PlaceSuggestion[]> {
  const { data, error } = await supabase.functions.invoke('google-places', {
    body: { action: 'autocomplete', input, sessionToken, near },
  });
  if (error) throw error;
  return (data?.suggestions ?? []) as PlaceSuggestion[];
}

export async function placeDetails(s: PlaceSuggestion, sessionToken: string): Promise<LocationCandidate> {
  const { data, error } = await supabase.functions.invoke('google-places', {
    body: { action: 'details', placeId: s.placeId, sessionToken },
  });
  if (error) throw error;
  const p = data.place;
  return {
    id: `google-${p.placeId}`,
    label: s.main || p.name || p.address,
    secondary: s.secondary || p.address || '',
    latitude: p.latitude,
    longitude: p.longitude,
    type: 'calle',
    street: p.street,
    locality: p.locality,
    commune: p.commune,
    region: p.region,
    confidence: 'high',
    reason: 'Ubicación de Google Maps. Revisa el marcador antes de guardar.',
    source: 'google',
  };
}
