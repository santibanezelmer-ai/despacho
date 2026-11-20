# Verificación del dominio de reportes

Resend está conectado y el dominio `reportes.operixdispatch.com` fue registrado. La verificación aún no comenzó; no modificar los registros de `notify.operixdispatch.com` ni del sitio web.

Agregar estos registros en la zona DNS de `operixdispatch.com` (TTL automático):

| Tipo | Nombre | Valor | Prioridad |
| --- | --- | --- | --- |
| TXT | resend._domainkey.reportes | p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDTn7OBP13UHPzYPepkhiNcOw8pKTY+MUmIm+6n6spMQTRpbnv1qQYPoXEcu3awyvBsVUs0pxwbzUdy7zU7v3i0Dh8pt5Y4qSjtBOc94MeftwDy7Mg9i8CwWJhozB+F0+bQO4zgG/lCK0rlRSbY9+upxGLg9ychK5XSDjuHqaObDwIDAQAB | — |
| MX | send.reportes | feedback-smtp.sa-east-1.amazonses.com | 10 |
| TXT | send.reportes | v=spf1 include:amazonses.com ~all | — |
| CNAME | rsend.reportes | send.forge.rmta.net | — |

Después solicitar verificación en Resend y comprobar estado `verified` antes de activar la programación. La función rechaza envíos mientras el dominio no está verificado.

## Estado de implementación

- Función dedicada: `monthly-operational-report`; requiere credencial de programación administrada, nunca una sesión de usuario.
- Modo `dry-run` prueba lectura y cálculo sin insertar registros ni enviar correos.
- Solo organizaciones activas y miembros activos con rol oficial o administrador; destinatarios deduplicados por cuenta y organización.
- Reporte del mes calendario anterior en America/Santiago; despacho a primera llegada 6-3, claves, cierres, duración y kilometraje registrado.
- Datos personales de llamantes y personal no se consultan; correo del destinatario solo se usa para entrega.
- Registro de entrega exclusivo del sistema y clave estable de evento para evitar duplicados.
- Programación pendiente: dos ejecuciones el día 1, a las 11:00 y 12:00 UTC, con comprobación local que permite solo las 08:00 de Chile. Son dos comprobaciones mensuales, una omitida según la estación; no se ha creado ninguna.
- Verificación realizada: 5 pruebas; callback autenticado 200 con 3 organizaciones/7 destinatarios, cero envíos; petición sin credencial 401. Entrega real y ejecución programada pendientes de verificación DNS.