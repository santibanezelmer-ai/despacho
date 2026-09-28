# Despacho sin internet

## Qué verá el operador
- Si no hay internet, el botón **Despachar** igual funciona: los tonos de las compañías suenan de inmediato y la emergencia queda en pantalla con la etiqueta **"Pendiente de envío"**.
- Arriba de la consola aparece un aviso rojo **"Sin conexión — N despachos en cola"**.
- Cuando vuelve internet, los despachos pendientes se envían solos, en orden. Recién ahí se asignan el folio EMG-AAAA-XXXX y las notificaciones a los celulares, y el aviso pasa a verde **"Sincronizado"**.
- Ya no aparece el error "TypeError: Failed to fetch". Si algo falla al sincronizar, se muestra un mensaje claro y se puede reintentar.

## Límites que hay que aceptar
- Sin internet no se puede avisar a los celulares de los voluntarios ni a otras pantallas. Solo suena el equipo que despacha. Los avisos salen al reconectar.
- El folio definitivo se asigna al sincronizar, porque lo genera el servidor.
- Para despachar sin conexión, la consola tiene que haberse abierto al menos una vez con internet. Así quedan guardados los tonos, las claves, los móviles y las compañías.

## Detalles técnicos
- **Tonos disponibles sin conexión:** se precargan los MP3 de las compañías y el tono global en Cache Storage al abrir la consola. `playNextGlobalTone` los lee desde el caché si no hay red. Se agrega una regla de runtimeCaching (CacheFirst) para el almacenamiento público de audios.
- **Datos de referencia:** las claves, los móviles, las compañías y los voluntarios se guardan en localStorage cada vez que se cargan bien. `DispatchForm` los usa cuando la consulta falla.
- **Cola de despachos:** nuevo `src/services/offlineDispatchQueue.ts` (en IndexedDB/localStorage), con un `client_id` UUID por despacho para no crear duplicados. `handleSubmit` detecta `!navigator.onLine` o un error de red: toca los tonos, guarda en la cola y muestra una tarjeta local.
- **Sincronización:** hook `useOfflineDispatchSync` en `AppLayout`. Con el evento `online`, o cada 15 s mientras haya cola, repite la misma secuencia actual: insertar la emergencia, los `emergency_vehicles` y el `emergency_log`, y luego enviar el push. La hora original de despacho se guarda en el registro.
- **Sin cambios** en tablas, RLS, triggers de folio, Realtime ni GPS.
- **App Android:** funciona igual, pero requiere un AAB nuevo (`git pull` + `npx cap sync`).
