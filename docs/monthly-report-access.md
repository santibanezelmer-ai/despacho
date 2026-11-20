# Acceso temporal a reportes mensuales — preparación

## Estado de instalación

El código del servicio y la migración están en `docs/prepared/monthly-report-access/`, fuera del directorio de despliegue automático. No están instalados en producción. No se cambió Storage, DNS, cron ni `EMAIL_SEND_ENABLED=false`.

La vista previa incluye `/reportes/consulta` y `/reportes/consulta/descargar`, independientes de proveedores de sesión, organización, consola y registro de notificaciones. Hasta instalar el servicio autorizado, un enlace no puede devolver datos reales.

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

El servicio falla cerrado si el control o la identidad de origen no están disponibles. Antes de habilitar se debe comprobar qué cabecera de origen es normalizada por el proxy del alojamiento y que no puede suplantarse. La limpieza de contadores antiguos es acotada y oportunista; no utiliza cron ni elimina reportes.

## Auditoría y límites honestos

Se registran emisión, consulta, solicitud autorizada de PDF y revocación por ID interno. Un evento `download` significa solicitud autorizada al servidor, no prueba de que el dispositivo terminó de guardar el archivo. El visor de administración muestra hasta 100 accesos y el recuento de los últimos 500 eventos, rotulado explícitamente.

Sin tokens originales en tablas, respuestas de error o consola; nunca registrar cuerpos HTTP de emisión/consumo ni HTML enviado a Resend. Cabeceras `no-store`, `no-referrer`, `nosniff` y `noindex` en respuestas. El fragmento evita Referer y logs HTTP de alojamiento. No es posible asegurar registros de terceros sin verificar su configuración: falta comprobar redacción de cuerpos de solicitudes/respuestas y ausencia de captura de fragmentos en la infraestructura real antes de habilitar.

**Un enlace es una credencial al portador:** está asociado al destinatario pero no verifica quién lo abre sin interacción adicional. Quien reenvíe el enlace concede ese acceso temporal; no equivale a autenticación de identidad. No se usan tokens de un solo uso, porque lectura, descarga y escáneres de correo necesitan accesos múltiples durante la vigencia.

## Archivos

- `src/App.tsx`: selección independiente de página pública.
- `src/pages/MonthlyReportSharedPage.tsx`: informe completo, descarga y estados.
- `src/lib/monthlyReportAccessClient.ts`: secreto solo en memoria, POST sin Referer/cookies/caché.
- `src/components/reports/MonthlyReportLinkAdmin.tsx` y `src/pages/MonthlyReportPage.tsx`: selección de destinatario, emisión, consultas y confirmación de revocación.
- `docs/prepared/monthly-report-access/migration.sql`: cuatro tablas privadas, privilegios explícitos y RPC de emisión, validación, auditoría, revocación y límites.
- `docs/prepared/monthly-report-access/functions/monthly-report-access/index.ts`: entrada validada del servicio.
- `docs/prepared/monthly-report-access/functions/_shared/`: lógica, copias congeladas del cálculo y HTML aprobados, renderer PDF adaptado para servidor, logotipo integrado y transporte Resend bloqueado.
- `src/test/monthlyReportAccess.test.ts` y `scripts/test-monthly-report-access.ts`: pruebas de reglas y PostgreSQL local, sin cuentas reales.

## Integración Resend preparada

La plantilla preparada recibe los dos enlaces seguros del registro emitido y no utiliza la dirección interna que exige sesión. La entrega verifica destinatario, hash, organización, fotografía, revocación y vencimiento; conserva supresiones e idempotencia existentes. No se conecta a envíos automáticos: debe autorizarse una instalación y después una prueba explícita. `reportes@operixdispatch.com` permanece como remitente, mediante la conexión existente y `RESEND_API_KEY`; no se crean secretos ni conexiones nuevas.

## Antes de activar (requiere autorización específica)

### Verificaciones realizadas en esta preparación

- 25 pruebas Vitest aprobadas: token aleatorio/hash, válidos/expirados/revocados/inexistentes, rechazo de selectores ajenos, PDF sin sesión, revocación siguiente descarga, frontera exacta, no persistencia, POST sin Referer y correos bloqueados; incluyen 11 regresiones de cálculos.
- 17 verificaciones PostgreSQL desechable: migración completa válida, 15 días calendario y cambio horario chileno, consumo real del RPC, organización ajena rechazada, admin de compañía rechazado, inmutabilidad, auditoría, revocación, expiración, ACL directas y límite concurrente. No se aplicó esta migración a Lovable Cloud.
- Generador PDF ejecutado en Deno: 1 prueba aprobada, logotipo integrado y dos páginas con período 2026-10. Comprobación de tipos Deno del servicio aprobada.
- Playwright: página sin sesión a 1280×1800 y 390×844, consulta, descarga, revocación y enlace inválido; sin errores de ejecución ni desbordamiento horizontal, fragmento eliminado y almacenamiento vacío. Respuestas interceptadas controladas, no equivalen a prueba del servicio instalado ni a datos operativos reales.
- Compilación automática correcta.

Las verificaciones reales de emisión autenticada, infraestructura de logs, cabecera de origen y enlaces enviados por correo quedan pendientes de autorización de instalación/despliegue. No se afirma ausencia de exposición en registros externos sin observar esa infraestructura.

1. Revisar/aplicar SQL preparado mediante el mecanismo de migración autorizado, sin reescribirlo.
2. Instalar la entrada del servicio y sus dependencias aisladas en el directorio de funciones, evitando reemplazar funciones de correo ajenas a reportes.
3. Verificar origen del proxy, políticas efectivas, tiempo de servidor, cabeceras, registros de infraestructura y rendimiento del PDF.
4. Probar emisión/consulta/descarga/revocación con sesión real autorizada y otra organización; comprobar móviles.
5. Solo después autorizar despliegue/publicación y, separadamente, una eventual prueba de correo; los envíos globales y cron siguen desactivados.