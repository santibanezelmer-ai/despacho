# Mejoras en la Ventana de Despacho

Cinco mejoras sobre los módulos existentes, sin crear sistemas paralelos.

## 1. Ubicación compartida editable por el operador

Hoy la ubicación que llega por el enlace compartido sobrescribe siempre la de la emergencia.

- Se agrega a la emergencia una marca de origen de la ubicación: "compartida" o "modificada por operador" (campo nuevo, opcional, sin romper nada existente).
- Cuando el operador guarda una ubicación (mapa, arrastrar marcador o coordenadas manuales), la emergencia queda marcada como "modificada por operador".
- El servicio que recibe la ubicación del enlace deja de sobrescribir la ubicación cuando ya fue corregida por el operador; sigue guardando la lectura recibida en la solicitud de ubicación (queda visible como referencia y en el mapa en vivo).
- Mientras el operador no intervenga, la actualización automática funciona igual que ahora.
- En la pestaña Ubicación se muestra una etiqueta clara con el origen actual y, si existe, la ubicación original recibida.
- Cada cambio queda en la bitácora de la emergencia (origen anterior, coordenadas anteriores y nuevas).
- Todo lo demás (mapa, despacho, rutas, navegación, PDF) sigue leyendo la misma ubicación de la emergencia, por lo que usa automáticamente la corregida.

## 2. Cambio manual del estado de los oficiales/voluntarios

Se reutiliza exactamente la estructura de estados que ya existe en Voluntarios: estado (Activo, Inactivo, Licencia) y disponibilidad (Disponible / No disponible). No se crea un segundo sistema de estados ni estados nuevos.

- En la Ventana de Despacho, un panel compacto "Personal" permite buscar un oficial/voluntario y cambiar su estado y disponibilidad en un clic.
- La actualización se refleja de inmediato en la consola y, por la sincronización en tiempo real ya existente, en el resto de las vistas.
- Cada cambio se registra en la auditoría (quién, cuándo, estado anterior y nuevo).
- Solo visible para quienes ya tienen permiso de escritura/operación; no se tocan roles ni autenticación.

Nota: los estados "Ocupado", "En emergencia" y "En cuartel" no existen hoy en el registro de personal (la presencia en una emergencia se deriva de la asignación a un móvil). Si los quieres como estados propios, se agregan en una segunda etapa.

## 3. Validación al finalizar con móviles pendientes

- Al pulsar el paso a "Finalizada", se revisa si quedan móviles sin liberar.
- Si todos están en cuartel, finaliza como hoy.
- Si hay pendientes, se abre una ventana: "Hay móviles que aún no han sido enviados a cuartel", con la lista de móviles pendientes y ya liberados, y para cada pendiente: identificación, estado actual, campo de kilometraje y botón "Marcar en cuartel".
- El kilometraje pasa a ser obligatorio y validado (numérico, no negativo, no menor al kilometraje de salida).
- Se usan las mismas funciones y datos de retorno de móviles que ya existen (misma tabla, mismo cierre automático y misma bitácora).
- El botón "Finalizar emergencia" solo se habilita cuando no quedan pendientes.

## 4. Corrector ortográfico en los campos de texto

- Se activa el corrector nativo del navegador/dispositivo en dirección, referencia, observaciones, preinforme y demás campos libres, con idioma español de Chile.
- El navegador subraya las palabras dudosas y ofrece sugerencias al pulsar sobre ellas; nunca corrige solo.
- Nombres propios, sectores rurales, rutas, abreviaciones y códigos operativos se pueden escribir siempre: el corrector solo sugiere.
- Sin librerías extra, sin costo de rendimiento ni re-dibujados.

## 5. Zoom con la rueda del mouse en el mapa de despacho

- La rueda vuelve a acercar/alejar sobre el mapa, manteniendo los botones +/− y el zoom táctil.
- Para no romper el desplazamiento de la ventana (que fue un pedido anterior), la rueda hace zoom cuando el mapa está activo (tras un clic o al mantener el cursor sobre él con la ventana ya posicionada) y se libera al salir del mapa, de modo que el resto de la ventana sigue desplazándose con normalidad.
- No se cambia la librería de mapas, ni marcadores, rutas, GPS ni el centrado automático de la emergencia.

## Detalles técnicos

- Base de datos: una migración aditiva agrega `emergencies.location_source` (texto, nulo permitido) y `emergencies.location_shared_lat/lng` para conservar la lectura original; sin cambios destructivos.
- `supabase/functions/location-share/index.ts`: omite el `update` de `emergencies` cuando `location_source = 'operador'`.
- `src/hooks/useEmergencyActions.ts`: `useUpdateLocation` marca `location_source = 'operador'` y registra en `emergency_log` + `insert_audit_log`.
- `src/components/dispatch/EmergencyActionsPanel.tsx`: etiqueta de origen, `spellCheck`/`lang="es-CL"` en campos de texto, `scrollWheelZoom` habilitado con activación por interacción, nueva sección "Personal" y validación previa a finalizar.
- Nuevo `src/components/dispatch/VolunteerStatusPanel.tsx` que usa `useVolunteers` y actualiza `volunteers.status`/`available`.
- Nuevo `src/components/dispatch/FinalizeEmergencyDialog.tsx` que reutiliza la lógica de `VehicleReturnManager` (KM obligatorio) y solo entonces llama al avance a `finalizada` existente en `DispatchConsole` / `ActiveEmergencyCard`.
