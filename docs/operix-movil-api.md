# Operix Móvil — Infraestructura y API (la app aún NO existe)

Base: `https://<PROJECT>.supabase.co/functions/v1/operix-movil`
Headers comunes: `apikey: <ANON_KEY>`, `Authorization: Bearer <ANON_KEY>`, `Content-Type: application/json`.
Tras la activación, todas las llamadas incluyen además `x-device-token: <device_token>`.

## Tablas

| Tabla | Uso |
|---|---|
| `vehicle_device_codes` | Códigos de activación temporales de un solo uso (`code`, `expires_at`, `used_at`, `used_by_device_id`). |
| `vehicle_devices` | Dispositivo autorizado: `organization_id`, `vehicle_id` (móvil asociado), `token_hash`, `status` (`active`/`revoked`), `last_seen_at`, `vehicle_changed_at`. |
| `vehicle_positions` | Historial GPS: `latitude`, `longitude`, `accuracy`, `speed`, `heading`, `captured_at`, `vehicle_id`, `device_id`, `emergency_id`. |
| `vehicle_last_positions` | Última posición por móvil (actualizada por trigger `vehicle_positions_sync_last`). Fuente para mapas y fichas. |

Se reutilizan sin cambios: `vehicles` (incluidos sus estados `disponible`, `en_servicio`, `mantencion`, `fuera_servicio`), `emergencies`, `emergency_vehicles`, `organizations`.

## Endpoints

### 1. `POST /activate`
```json
{ "code": "A7K2M9QP", "device_name": "Tablet B-1", "platform": "android" }
```
→ `{ device_id, device_token, organization, vehicles: [{ id, code, type, status }] }`
El código se reserva de forma atómica antes de crear el dispositivo: si la creación falla, el código se libera. Un reintento de la misma activación (código recién usado, dispositivo aún sin móvil ni actividad) devuelve 200 con el mismo `device_id` y un token nuevo, sin duplicar dispositivos. Devuelve 410 si el código no existe, expiró o ya fue usado por un dispositivo en operación.

### 2. `POST /select-vehicle` (cambiar móvil)
```json
{ "vehicle_id": "<uuid>" }
```
Valida que el móvil pertenezca a la organización del dispositivo. Se usa tanto en la selección inicial como en "Cambiar móvil" (la app debe pedir confirmación). Desde ese momento las nuevas posiciones quedan asociadas al nuevo móvil.

### 3. `POST /session`
→ `{ device, vehicle, last_position, emergency, gps_policy }`
`emergency` es la emergencia activa asignada al móvil (vía `emergency_vehicles` sin `released_at`), con folio, clave, dirección y coordenadas para mostrar información básica y abrir Google Maps/Waze externamente.

### 4. `POST /position`
Individual o por lotes (para tolerar pérdida de conexión):
```json
{ "latitude": -33.45, "longitude": -70.66, "accuracy": 8, "speed": 12.4, "heading": 180, "timestamp": "2026-08-30T19:00:00Z" }
{ "positions": [ { ... }, { ... } ] }
```
El backend agrega `organization_id`, `device_id`, `vehicle_id` y la `emergency_id` activa; `vehicle_last_positions` conserva siempre la posición más reciente por `captured_at`. La respuesta incluye `gps_policy` para que el servicio Android reajuste su frecuencia sin esperar el siguiente `/session`.

## Frecuencia GPS adaptativa (`gps_policy`)

Reglas determinísticas (sin IA), calculadas en la Edge Function y publicadas en `/session` y `/position`. La aplicación **no** cambia el contrato de `/position`: sigue enviando `latitude`, `longitude`, `accuracy`, `speed`, `heading`, `captured_at` (y el backend resuelve `emergency_id`).

```json
{
  "reason": "en_servicio",
  "tracking": true,
  "interval_seconds": 15,
  "idle_interval_seconds": 60,
  "idle_after_seconds": 120,
  "idle_distance_meters": 25
}
```

| Situación | `tracking` | Frecuencia | Detenido >2 min |
|---|---|---|---|
| Emergencia activa (prioridad máxima) | sí | 5 s | 5 s (no se degrada) |
| `en_servicio` sin emergencia | sí | 15 s | 60 s |
| `disponible` | sí | 30 s | 60 s |
| `mantencion` | no | — | — |
| `fuera_servicio` | no | — | — |

Reglas para el cliente (`LocationService`):

1. Un único timer/`Handler` con reprogramación (`postDelayed`), nunca timers paralelos.
2. Un solo envío en vuelo: bandera `isSending`; si hay uno activo, se omite el tick.
3. Detención estable: se guarda la última posición "de referencia" y su hora; se considera detenido solo si durante `idle_after_seconds` (120 s) todas las lecturas quedaron dentro de `idle_distance_meters` (25 m) del punto de referencia. Nunca por un solo `speed = 0`.
4. `tracking: false` → se detiene el envío periódico y las actualizaciones de ubicación (ahorro de batería); se sigue consultando `/session` cada 60 s para detectar cambios de estado o emergencia.
5. Sin conectividad: la posición se guarda en cola local y se reenvía por lotes (`{ "positions": [...] }`) en el siguiente tick exitoso, sin solicitudes simultáneas.
6. Al cambiar el estado del móvil o al aparecer/desaparecer una emergencia, la nueva `gps_policy` que llega en cualquier respuesta reprograma el intervalo automáticamente.

### 5. `POST /vehicle-status`
```json
{ "status": "en_servicio" }
```
Solo estados existentes; no se crea un sistema paralelo.

### 6. `POST /vehicles`
Lista los móviles de la organización del dispositivo.

## Seguridad

- El dispositivo no tiene cuenta de usuario ni acceso directo a la base de datos: solo la Edge Function (service role) escribe, tras validar el hash SHA-256 del token.
- Todas las consultas del dispositivo se filtran por su `organization_id`; un móvil de otra organización devuelve 404.
- RLS: lectura de dispositivos y posiciones limitada a miembros de la organización; generación/revocación de códigos y dispositivos solo para `admin` de la organización o superadmin.
- Trigger `vehicle_devices_enforce_scope` impide mover un dispositivo de organización o asociarlo a un móvil ajeno.

## Consumo en el frontend actual

- `useVehicleDevices` / `useVehicleDeviceCodes` / `useVehicleDeviceActions`: administración desde el panel de la organización.
- `useVehicleLastPositions` + `formatPositionAge` / `isPositionStale`: última posición por móvil, lista para usarse en Mapa Operativo, Pantalla Central, `/pantalla-mapa`, ficha del móvil y emergencia (Leaflet + OpenStreetMap, sin cambios de proveedor).
