# Mapa Operativo unificado y reasignación de móviles con 6-9

## 1. Pantalla Central → Mapa Operativo (/pantalla-mapa)

Hoy hay dos mapas distintos:
- Consola (/mapa): usa el mapa compartido con móviles por estado, capas territoriales, grifos con ficha, cuarteles y ubicación compartida.
- Pantalla Central (/pantalla-mapa): mapa propio, más antiguo, sin esas mejoras. Sus botones `+` y `−` quedan tapados por la barra "Mapa Operativo / reloj" (ambos arriba a la izquierda).

Cambios:
- La Pantalla Central pasa a usar el mismo mapa compartido de la consola (mismos marcadores, estados y posición de móviles, emergencias, ubicación compartida, grifos, cuarteles, capas territoriales, actualización cada pocos segundos). Se elimina el código duplicado.
- Se mantiene su formato de pantalla completa para TV: barra con título, conteo y reloj.
- Los botones `+` y `−` nativos se mueven abajo a la izquierda (o se desplaza la barra) para que nunca queden tapados, con capa por encima de la barra y funcionando en TV y pantallas chicas.

## 2–3. Disponibilidad de móviles

Regla nueva (una sola, usada en despacho nuevo y en "Agregar móvil" de una emergencia activa):

| Situación del móvil | Se puede asignar | Cómo se muestra |
|---|---|---|
| Disponible en cuartel | Sí | `B-1 — Disponible` |
| En emergencia activa, sin 6-9 | No (bloqueado) | `B-1 — EMG-2026-0233 — 6-3 En el lugar — No disponible` |
| En emergencia activa, con 6-9 | Sí | `B-1 — 6-9 — Disponible para reasignación (EMG-2026-0233)` |
| En emergencia de clave 10-9 | Sí, con aviso | `B-1 — 10-9 en curso (EMG-…) — Asignable` |
| Mantención / fuera de servicio | No (como hoy) | sin cambios |

Los móviles bloqueados se ven en la lista, deshabilitados, con el motivo; no se ocultan.

## 4. Historial y trazabilidad

Al reasignar un móvil con 6-9 (o en 10-9) a la Emergencia B:
- En la Emergencia A su participación se cierra con la hora de reasignación (queda con todas sus claves y horarios hasta el 6-9) y la bitácora registra "Móvil B-1 reasignado a EMG-B desde 6-9". No se borra nada; el kilometraje de llegada no se exige (no volvió a cuartel).
- En la Emergencia B se crea una participación nueva desde 6-0, con su propia bitácora "Móvil B-1 asignado (reasignado desde EMG-A)".
- El móvil sigue "en servicio"; no se registra retorno a cuartel.
- La ficha PDF de A sigue mostrando al móvil con sus claves hasta el 6-9.

Protección: antes de guardar se vuelve a comprobar en el servidor que el móvil no tenga otra participación abierta sin 6-9, para impedir asignaciones simultáneas por error (dos operadores a la vez).

## 5. Validaciones
Probaré en pantalla con la organización Demo: sin 6-9 bloqueado; con 6-9 asignable; sin retorno a cuartel; historial de A intacto y de B nuevo; 10-9 visible y asignable; Mapa Operativo mostrando el nuevo estado. No se tocan las claves, el despacho ni las notificaciones (la notificación de B sale igual que cualquier despacho).

## Detalles técnicos
- `MapScreen.tsx` se reescribe sobre `LeafletMapCanvas` reutilizando la preparación de datos de `OperativeMap.tsx` (se extrae a un hook compartido `useOperativeMapData`).
- Nuevo `src/lib/vehicleAvailability.ts` + hook `useVehicleAvailability` que cruza `vehicles` con `emergency_vehicles` abiertas (`released_at IS NULL`) y la clave de la emergencia; usado en `DispatchForm.tsx` y `EmergencyActionsPanel.tsx`.
- Reasignación: cerrar la fila abierta de A con `released_at = now()` (sin `odometer_end`, `operational_status` se mantiene en `retirandose`) e insertar la nueva fila en B; `vehicles.status` queda `en_servicio`. Sin tablas nuevas.
- Comprobación al guardar contra filas abiertas; si se requiere a nivel de base de datos, una función de validación (pediré confirmación antes de tocar la base).
- Se registra la regla en AGENTS.md.
