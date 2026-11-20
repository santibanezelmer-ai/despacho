# Acceso temporal a reportes mensuales — instalación

## Estado de instalación

Instalación autorizada por Susana el 20 de noviembre de 2026. Respaldo diario previo informado por Susana: 20 de noviembre, 13:13 UTC, con «Restore to this backup» disponible. No se ejecutó una restauración de prueba ni se creó un respaldo adicional; la disponibilidad de restauración no equivale a ensayo de recuperación. Restaurar ese respaldo perdería los cambios posteriores y revertiría el esquema.

SQL preparado instalado como `drizzle/migrations/0028_install_monthly_report_secure_access.sql` (igual salvo salto de línea final). La inspección detectó GRANT de lectura heredados por las tablas nuevas: `0029_restrict_monthly_report_access_table_grants.sql` los retiró de anon/authenticated, sin tocar objetos ajenos. Las cuatro tablas tienen RLS y acceso directo solo del servicio.

`supabase/functions/monthly-report-access/` está desplegada con dependencias propias en `_shared/`, sin reemplazar helpers de otros servicios. `/reportes/consulta` y `/reportes/consulta/descargar` funcionan con el servicio real desde la vista previa. El sitio oficial todavía sirve un paquete anterior que no incluye estas rutas: falta actualizar la publicación desde Lovable y verificar allí, sin modificar DNS. No se cambió Storage, DNS, cron ni `EMAIL_SEND_ENABLED=false`.

## Arquitectura

1. Un administrador de organización (activo, sin restricción de compañía) elige mes y destinatario autorizado. El servidor valida su sesión y membresía; nunca acepta privilegios desde el navegador.
2. Una fotografía privada, agregada e inmutable por organización y período conserva los indicadores calculados por `loadReport`/`summarize`. No guarda registros individuales, teléfonos, RUT ni correos de voluntarios. No se crea un bucket ni URL de documento público.
3. Se emiten 32 bytes aleatorios mediante Web Crypto; solo se guarda SHA-256. El registro vincula destinatario y fotografía mediante FK compuesta de organización. Una nueva emisión no modifica ni borra el histórico.
4. Los enlaces llevan el secreto en el fragmento `#`, no en ruta ni query. La página lo retira inmediatamente y lo conserva exclusivamente en memoria. No se usa localStorage, sessionStorage, cookies ni caché de consultas para estos secretos. Recargar requiere reabrir el correo original.
5. Cada consulta o descarga manda el secreto por POST cifrado al servicio. La función aplica límite compartido y el RPC valida revocación, vencimiento, organización activa y elegibilidad actual del destinatario. No acepta identificadores ni selectores adicionales en solicitudes públicas.
6. Los 15 días calendario se calculan en servidor, a la misma hora local de America/Santiago. Un cambio horario puede equivaler a 359 o 361 horas; no se redondea al fin del día. Se rechaza desde `now >= expires_at`.
7. La descarga vuelve a validar el enlace y genera el PDF en el servidor desde la misma fotografía. Responde `application/pdf` y `Content-Disposition: attachment`; el navegador no regenera usando información consultada previamente.
8. Revocación y consumo toman el mismo bloqueo de fila: después de confirmar revocación, las solicitudes siguientes no pasan. No puede retirarse un PDF ya descargado ni el contenido ya visto; un acceso iniciado antes de la revocación puede terminar.

## Protección contra abuso autorizada

Control propio transaccional en PostgreSQL, compartido entre instancias: 10 solicitudes por enlace/minuto, 30 por origen/minuto y techo global de 600/minuto. Exceso bloquea temporalmente 10 minutos. Orígenes se guardan como digest con sal secreta del servidor; jamás se guarda IP original. Los límites no sustituyen protección perimetral frente a DDoS.

El servicio falla cerrado si el control o la identidad de origen no están disponibles. Dos cabeceras x-forwarded-for distintas enviadas por el cliente no crearon orígenes distintos: el recuento permaneció en un único contador de origen, sin registrar IP ni digest. Esto es evidencia puntual de normalización, no una garantía de todos los caminos del proxy. La limpieza de contadores antiguos es acotada y oportunista; no utiliza cron ni elimina reportes.

## Auditoría y límites honestos

Se registran emisión, consulta, solicitud autorizada de PDF y revocación por ID interno. Un evento `download` significa solicitud autorizada al servidor, no prueba de que el dispositivo terminó de guardar el archivo. El visor de administración muestra hasta 100 accesos y el recuento de los últimos 500 eventos, rotulado explícitamente.

Sin tokens originales en tablas, respuestas de error o consola; nunca registrar cuerpos HTTP de emisión/consumo ni HTML enviado a Resend. Cabeceras `no-store`, `no-referrer`, `nosniff` y `noindex` en respuestas. El fragmento evita Referer y logs HTTP de alojamiento. Los registros de función disponibles tras la prueba no contienen tokens de 64 caracteres ni campos de cuerpo HTTP. No se puede certificar la configuración de todos los registros externos ni capturadores de navegador a partir de esos registros; esa limitación sigue explícita.

**Un enlace es una credencial al portador:** está asociado al destinatario pero no verifica quién lo abre sin interacción adicional. Quien reenvíe el enlace concede ese acceso temporal; no equivale a autenticación de identidad. No se usan tokens de un solo uso, porque lectura, descarga y escáneres de correo necesitan accesos múltiples durante la vigencia.

## Archivos

- `src/App.tsx`: selección independiente de página pública.
- `src/pages/MonthlyReportSharedPage.tsx`: informe completo, descarga y estados.
- `src/lib/monthlyReportAccessClient.ts`: secreto solo en memoria, POST sin Referer/cookies/caché.
- `src/components/reports/MonthlyReportLinkAdmin.tsx` y `src/pages/MonthlyReportPage.tsx`: selección de destinatario, emisión, consultas y confirmación de revocación.
- `docs/prepared/monthly-report-access/migration.sql`: cuatro tablas privadas, privilegios explícitos y RPC de emisión, validación, auditoría, revocación y límites.
- `supabase/functions/monthly-report-access/index.ts`: entrada validada del servicio instalado.
- `supabase/functions/monthly-report-access/_shared/`: dependencias aisladas del servicio, cálculo y HTML aprobados, renderer PDF para servidor, logotipo integrado y transporte Resend bloqueado. Las copias preparadas se conservan como referencia.
- `src/test/monthlyReportAccess.test.ts` y `scripts/test-monthly-report-access.ts`: pruebas de reglas y PostgreSQL local, sin cuentas reales.

## Integración Resend preparada

La plantilla preparada recibe los dos enlaces seguros del registro emitido y no utiliza la dirección interna que exige sesión. La entrega verifica destinatario, hash, organización, fotografía, revocación y vencimiento; conserva supresiones e idempotencia existentes. No se conecta a envíos automáticos: debe autorizarse una instalación y después una prueba explícita. `reportes@operixdispatch.com` permanece como remitente, mediante la conexión existente y `RESEND_API_KEY`; no se crean secretos ni conexiones nuevas.

## Verificación de instalación autorizada

- 30 pruebas Vitest aprobadas; comprobación Deno y prueba PDF de dos páginas aprobadas; compilación automática correcta.
- Sesión real del administrador de Entre Lagos: emisión desde el panel para sí mismo, período 2026-10; un único enlace, sin correo. Se conservó una fotografía agregada y su histórico auditado; no se modificaron emergencias, móviles ni personal.
- Página sin sesión en escritorio 1280×1800 y teléfono 390×844: consulta HTTP 200, fragmento limpiado y almacenamiento vacío. PDF descargado y leído: dos páginas, Entre Lagos y 2026-10 correctos.
- Manipulación de organization_id en consulta pública: HTTP 400; SELECT anónimo directo de snapshots: HTTP 401. Privilegios directos de las cuatro tablas y RPC inspeccionados y restringidos.
- Revocación desde el panel, seguida de consulta y descarga: HTTP 410 con estado revoked; mensaje visible en teléfono. El enlace de prueba quedó revocado, no hay un acceso de prueba vigente.
- Auditoría leída: una emisión, una consulta, una descarga autorizada y una revocación. Vencimiento almacenado comprobado: exactamente 15 días calendario locales; frontera y DST siguen cubiertos por pruebas previas, no por espera real de 15 días.
- Límite real probado sin crear otro acceso: diez consultas de un token inexistente devuelven 404 y la undécima 429. Cabeceras no-store, no-referrer y nosniff presentes. Dos cabeceras de origen suplantadas no cambiaron el contador de origen.
- No hay cron de reportes en el inventario consultado; solo tareas preexistentes ajenas, sin cambios. EMAIL_SEND_ENABLED sigue false. Ningún envío real.
- Pendiente: actualización del frontend publicado y comprobación de la página en operixdispatch.com. La prueba real de servicio NO equivale a publicación del frontend. No se generó otro enlace ni se envió correo.

### Verificaciones realizadas en esta preparación

- 25 pruebas Vitest aprobadas: token aleatorio/hash, válidos/expirados/revocados/inexistentes, rechazo de selectores ajenos, PDF sin sesión, revocación siguiente descarga, frontera exacta, no persistencia, POST sin Referer y correos bloqueados; incluyen 11 regresiones de cálculos.
- 17 verificaciones PostgreSQL desechable: migración completa válida, 15 días calendario y cambio horario chileno, consumo real del RPC, organización ajena rechazada, admin de compañía rechazado, inmutabilidad, auditoría, revocación, expiración, ACL directas y límite concurrente. No se aplicó esta migración a Lovable Cloud.
- Generador PDF ejecutado en Deno: 1 prueba aprobada, logotipo integrado y dos páginas con período 2026-10. Comprobación de tipos Deno del servicio aprobada.
- Playwright: página sin sesión a 1280×1800 y 390×844, consulta, descarga, revocación y enlace inválido; sin errores de ejecución ni desbordamiento horizontal, fragmento eliminado y almacenamiento vacío. Respuestas interceptadas controladas, no equivalen a prueba del servicio instalado ni a datos operativos reales.
- Compilación automática correcta.

La emisión, consulta, descarga y revocación reales se verificaron en esta instalación. El envío por correo sigue fuera del alcance autorizado; no se afirma ausencia de exposición en registros externos no observables.

1. Actualizar la publicación del frontend desde el diálogo de publicación de Lovable; no hay herramienta de publicación disponible en esta sesión.
2. Verificar la página en el dominio oficial tras esa actualización, con un nuevo enlace controlado y revocación final.
3. Autorizar por separado cualquier prueba de correo; los envíos globales y cron siguen desactivados.