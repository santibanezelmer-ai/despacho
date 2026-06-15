# Plan — Operix Voluntario (PWA)

App instalable bajo `/voluntario`, aislada del panel administrativo. Voluntarios solo leen emergencias de su organización y reciben push.

## 1. Backend (migración Supabase)

### Rol nuevo
- Añadir `'voluntario'` al enum `org_role`.
- Función helper `is_org_volunteer(_org_id)` y actualizar `can_write_in_org` para excluir voluntarios (ya lo hace; confirmar).

### Vínculo cuenta ↔ ficha de voluntario
- Añadir a `public.volunteers`:
  - `user_id uuid` (FK `auth.users`, único, nullable)
  - `pwa_enabled boolean default true`
  - `invitation_sent_at timestamptz`
- Trigger: al aceptar invitación con rol `voluntario`, enlazar `volunteers.user_id` si el email coincide.

### RLS para voluntarios
- `emergencies`: política SELECT permite a voluntarios ver emergencias de su org cuando `pwa_enabled = true` y `volunteers.active`.
- `emergency_vehicles`, `emergency_personnel`, `emergency_log`: SELECT para voluntarios de la org.
- `emergency_keys`, `companies`, `vehicles`, `volunteers` (solo su propia ficha): SELECT.
- Bloquear INSERT/UPDATE/DELETE para `voluntario` en todas las tablas operativas (revisar policies actuales con `has_org_role` excluyendo voluntario).
- `device_tokens`: ya existe; voluntarios pueden registrar el suyo.

### Confirmar asistencia (opcional)
- Nueva tabla `public.emergency_attendance`:
  - `emergency_id`, `user_id`, `volunteer_id`, `confirmed_at`, `status` (`going|not_going`).
  - RLS: voluntario gestiona sus propias filas; admin/oficial/operador leen todas de su org.

### Invitaciones
- Reusar `organization_invitations` con rol `voluntario`. Desde la ficha del voluntario, admin envía invitación al email; al aceptar, `accept_invitation` ya inserta member; añadir paso de linkeo a `volunteers.user_id`.

## 2. Frontend — PWA scope `/voluntario`

### Routing
- Nueva sección `src/pages/voluntario/*` con su propio layout (no usa `AppLayout` ni `MobileLayout`).
- Rutas:
  - `/voluntario` → feed de emergencias activas
  - `/voluntario/login` → login dedicado (mismo Supabase auth, branding distinto)
  - `/voluntario/emergencia/:id` → detalle
  - `/voluntario/historial`
  - `/voluntario/perfil` (sonido, notificaciones, logout)
- Guard: si user no tiene membership con rol `voluntario` en alguna org activa → mostrar "Acceso solo para voluntarios" + logout. Si tiene rol admin/operador/etc., redirigir a `/` (no se mezcla).
- En `App.tsx`, agregar bloque que detecta `location.pathname.startsWith('/voluntario')` antes del resto.

### PWA instalable
- `public/manifest-voluntario.webmanifest` con:
  - `name`: "Operix Voluntario", `short_name`: "Voluntario"
  - `start_url`: `/voluntario`, `scope`: `/voluntario`
  - `display: standalone`, `theme_color`, `background_color`
  - Íconos propios (generar con imagegen)
- `index.html` referencia condicional, o página `/voluntario` inyecta manifest vía Helmet.
- Service worker: extender configuración `vite-plugin-pwa` ya existente o servir un SW dedicado en `/voluntario-sw.js`. Mantener guards de preview existentes.

### FCM Web Push
- Crear `public/firebase-messaging-sw.js` para mensajes en background.
- Inicializar Firebase Web SDK en cliente solo dentro de `/voluntario`.
- Reusar tabla `device_tokens` (añadir columna `platform = 'web'` ya soportada).
- VAPID key como secret público (`VITE_FCM_VAPID_KEY`).
- Edge function `send-push-notification` ya envía vía FCM HTTP v1; verificar que acepta tokens web y usa payload `webpush` con `notification.click_action` apuntando a `/voluntario/emergencia/:id`.

### UI (móvil-first, modo oscuro)
- Feed: cards grandes con tipo, dirección, hora, estado, badge color de clave.
- Detalle: info completa + botón "Abrir en Google Maps" (link `https://www.google.com/maps?q=lat,lng`), botón "Confirmar asistencia".
- Historial: lista paginada de emergencias pasadas de su org.
- Perfil: toggle de sonido, prueba de notificación, cambiar contraseña, cerrar sesión.

## 3. Admin: gestión de cuentas de voluntarios

- En `src/pages/Volunteers.tsx`, agregar por fila:
  - Estado de cuenta PWA (sin invitar / pendiente / activa / bloqueada).
  - Botón "Invitar a PWA" → crea `organization_invitations` rol `voluntario` y dispara email.
  - Toggle `pwa_enabled` para bloquear acceso sin borrar la cuenta.
  - Botón "Revocar acceso" → desactiva membership.

## 4. Restricciones (seguridad)

- Voluntario nunca aterriza fuera de `/voluntario` (guard de ruta + RLS).
- No se solicitan permisos de geolocalización en ninguna pantalla de voluntario.
- Service worker de voluntario no cachea APIs admin.

## Detalles técnicos

- **Stack añadido**: `firebase/app` + `firebase/messaging` (solo en chunk de voluntario para no inflar bundle admin) vía `import()` dinámico.
- **VAPID key**: el usuario debe proporcionarla desde Firebase Console → Cloud Messaging → Web configuration. La pediré como secret cuando llegue ese paso.
- **Service worker**: usaré `vite-plugin-pwa` con `additionalManifestEntries` y un SW combinado, o un SW manual `firebase-messaging-sw.js` registrado solo en `/voluntario` (más simple, evita reescribir el SW principal). Voy por esta vía.
- **Íconos**: generar con `imagegen` un set 192/512 con identidad propia (azul/rojo bombero, casco).
- **Diseño**: tokens semánticos existentes (`bg-background`, `text-emergency`), botones `min-h-14` para tap targets grandes.

## Orden de ejecución

1. Migración SQL (rol + columnas + RLS + tabla attendance).
2. Esperar tipos regenerados.
3. Generar íconos PWA.
4. Manifest + registro SW + estructura `/voluntario`.
5. Login + guards + feed + detalle + historial + perfil.
6. Integración FCM web (pedir VAPID key).
7. UI admin para invitar/gestionar voluntarios.
8. Probar flujo end-to-end.

## Fuera de alcance (pregunto si falta)

- Notificaciones push en iOS sin instalar PWA: Safari iOS requiere "Añadir a pantalla de inicio" para push, lo dejaré documentado en el onboarding.
- Push nativo (Capacitor) para voluntarios: se cubre con la PWA; si se quiere app nativa publicable, es otro proyecto.

¿Apruebas para empezar?
