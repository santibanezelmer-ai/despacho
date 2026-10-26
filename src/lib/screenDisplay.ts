/** Remote TV transport deliberately uses only the device secret, never a user session. */
export async function requestScreenDisplay(body: Record<string, unknown>, fetcher: typeof fetch = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetcher(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/screen-display`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('No se pudo conectar con la pantalla. Intenta nuevamente.');
    const data = await response.json();
    if (!data || data.error) throw new Error('No se pudo conectar con la pantalla. Intenta nuevamente.');
    if (body.action === 'create' && (typeof data.secret !== 'string' || !/^\d{6}$/.test(data.pin))) {
      throw new Error('No se pudo generar el código de vinculación.');
    }
    if (body.action === 'data' && !['pending', 'paired', 'invalid', 'revoked', 'expired'].includes(data.status)) {
      throw new Error('No se pudo actualizar la pantalla.');
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}