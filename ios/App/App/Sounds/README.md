# Tono de despacho para iOS (APNs)

`dispatch_tone.caf` es la versión iOS del tono personalizado (PCM 16-bit, 44.1 kHz,
mono, ~3 s — por debajo del límite de 30 s que impone APNs).

## Pasos tras `npx cap add ios`

1. Copia esta carpeta dentro del proyecto nativo si no aparece:
   `ios/App/App/Sounds/dispatch_tone.caf`
2. En Xcode, arrastra `dispatch_tone.caf` al target **App** y marca
   *Copy items if needed* + *Add to targets: App*. Debe quedar listado en
   **Build Phases → Copy Bundle Resources** (si no está ahí, iOS usará el
   sonido por defecto).
3. En **Signing & Capabilities** añade:
   - *Push Notifications*
   - *Background Modes* → **Remote notifications**
4. Sube la clave APNs (.p8) del equipo de Apple Developer a Firebase
   (Project settings → Cloud Messaging → APNs Authentication Key). Sin esto,
   FCM no puede entregar a dispositivos iOS.

## Cómo se envía

La edge function `send-push-notification` usa para `platform = 'ios'`:

- `apns-priority: 10`, `apns-push-type: alert`
- `aps.sound = { name: "dispatch_tone.caf", volume: 1.0 }`
- `interruption-level: time-sensitive` (atraviesa modos de Concentración)

## Sonido crítico (opcional)

Para que suene incluso con el móvil en silencio se requiere el entitlement
`com.apple.developer.usernotifications.critical-alerts`, que Apple concede
solo por solicitud. Si te lo aprueban, cambia `critical: 0` → `critical: 1`
en la edge function.
