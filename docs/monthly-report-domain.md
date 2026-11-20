# Reporte mensual: configuración y límites

- Dominio autorizado y verificado: operixdispatch.com. No agregar DNS ni registrar dominios.
- Remitentes preparados: reportes@, notificaciones@ y despacho@operixdispatch.com.
- RESEND_API_KEY actual es una credencial de conexión: se utiliza desde funciones mediante el transporte existente, junto con LOVABLE_API_KEY; no es una clave directa de la API de Resend.
- EMAIL_SEND_ENABLED=false es un bloqueo en código, no activable desde solicitudes ni variables. La función rechaza send con 423 y requiere autorización para dry-run; preview valida sesión y membresía activa admin/oficial.
- No se ha desplegado la función modificada. La versión publicada anterior permanece intacta y aún refería al subdominio descartado. Ninguna programación fue creada en esta tarea.
- La lógica de día 1 a las 08:00 Chile se conserva sin scheduler.
- /reportes/mensual?org=UUID&period=AAAA-MM usa el cliente autenticado y las políticas existentes para leer, sin depender de un despliegue nuevo; no amplía políticas.
- PDF dedicado usa jsPDF y autoTable. No utiliza la exportación CSV, no contiene firma digital y recalcula datos actuales al abrir: no es una fotografía histórica inmutable.
- Servicio 6-10: released_at menos assigned_at únicamente con operational_status=en_cuartel. Liberaciones por reasignación no cuentan; finished_at no sustituye el retorno.
- Respuesta: despacho a primera llegada válida por emergencia; promedio, mínimo, máximo, muestras y porcentaje sin llegada válida.
- Km: odómetros válidos no negativos, end>=start; cobertura expuesta. Sin pares válidos: S/D, no cero.
- Asistencias registradas: filas únicas por id de emergency_personnel, no personas únicas. No se suman volunteer_count ni confirmaciones going. Sin filas: S/D en métricas de actividad.
- Compañía según ficha actual: el esquema no tiene compañía histórica por participación.
- Comparativas: diferencia absoluta y relativa; porcentajes S/D con base cero o falta de muestras. No atribuir mejoras/empeoramientos automáticamente.
- report-delivery.ts prepara claim atómico mediante UNIQUE existente e idempotencia por organización/cuenta/período; no se invoca. Reclamos previos o fallidos requieren conciliación, no reenvío automático.
- Lista de supresión existente conservada. Los correos de autenticación actuales no se han migrado ni desactivado.

## Verificación de esta entrega

- Lecturas reales de columnas y FKs: todos los campos requeridos existen. La comprobación agregada encontró 65 servicios, 65 liberaciones, 25 llegadas y 58 pares de odómetro válidos (todos los períodos y organizaciones); no equivale a cobertura mensual por institución.
- emergency_personnel: funciones registradas conductor, oficial_a_cargo y voluntario; cero relaciones de personal con organización inconsistente en la comprobación.
- 13 pruebas unitarias iniciales aprobadas; verificaciones adicionales documentadas en el informe de entrega.
- Diseño de plantilla revisado en 1280x1800 y 390x844 sin desbordamiento horizontal, con muestra real de Demo - Demo (1 despacho noviembre, sin móviles). No representa un reporte completo de esa organización.
- Recorrido autenticado real pendiente: no fue posible obtener sesión propia; no se creó usuario ni se modificaron roles para probar.
- Compatibilidad de recepción Gmail/Outlook no verificada: ningún correo enviado.
- El logotipo CDN queda preparado, pero su ruta no fue verificable en localhost; vista local reutiliza el logotipo original. Verificar desde dominio oficial después de un despliegue autorizado.
