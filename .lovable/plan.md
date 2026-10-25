# Guardias por Compañía — Fase 0 y propuesta de ejecución

## Resultado de la auditoría

Auditoría de solo lectura del repositorio y del esquema real completada. No se cambiaron datos, tablas, políticas, pantallas ni funciones desplegadas. Se registraron únicamente requisitos, tareas y este diseño.

| Comprobación | Evidencia consultada | Resultado |
|---|---|---|
| Módulo previo | Catálogo real de tablas, tipos y búsqueda del repositorio | 48 tablas públicas; ninguna gestiona guardias, turnos o cupos. |
| Entidades base | Columnas, FK, restricciones e índices reales | Reutilizar organizations, companies, volunteers y organization_members. No duplicar personas, compañías ni membresías. |
| Autorización | Definiciones reales públicas y app_private | has_org_role y can_write_in_org exigen membresía activa sin compañía; is_company_admin exige admin activo de la compañía exacta. |
| Integridad | FK y triggers actuales | Compañías y voluntarios tienen organización inmutable, pero las FK simples no garantizan toda la coherencia compañía–voluntario–organización. |
| RLS y privilegios | pg_policies y privilegios efectivos | RLS habilitada; algunas lecturas actuales son organizacionales. No heredarlas como privacidad de Guardias. Privilegios amplios no significan acceso anónimo autorizado por RLS. |
| Auditoría | audit_log e insert_audit_log reales | Actor desde auth.uid(); admin de compañía no puede leer el historial general. Llamar auditoría por separado desde la interfaz no es atómico. |
| Asistencia actual | emergency_attendance y emergency_personnel | Participación en emergencias, no asistencia presencial de guardias. Mantenerlas intactas. |
| Notificaciones | send-push-notification y consumidores | Transporte reutilizable, pero el envío actual por organización no sirve para asignaciones privadas. |
| Interfaz | Rutas, AppLayout y componentes ui | Navegación, formularios, tema y selector de fechas reutilizables; falta calendario diario/semanal/mensual de turnos. |
| Pruebas existentes | Vitest: volunteerAccess, mobileVolunteerRouting, vehicleReturn y operationalPreReports | 42/42 aprobadas en 4 archivos. No son pruebas de Guardias ni de seguridad real. |

Solo se consultaron metadatos, sin datos personales. No se declara compilación ni recorrido autenticado de Guardias verificado: el módulo aún no existe.

## Diferencias con el informe anterior

Se confirma que no existe el módulo. El SQL anterior utilizaba firmas incorrectas de autorización, omitía GRANT y controles por acción, proponía cascadas que borrarían historia y nuevas referencias a auth.users. No aplicarlo. Cuatro tablas y UNIQUE(turno, voluntario) no cubren cupos, postulaciones, asistencia validada ni concurrencia.

Tu documento resuelve las decisiones pendientes: postulación con aprobación, Recursos → Guardias y llegada/salida manual validada por un oficial, sin GPS obligatorio. No imponer mínimos universales ni gestión global automática al administrador del Cuerpo.

## Qué construir

- **Recursos → Guardias:** calendario Día/Semana/Mes y lista, con compañías limitadas al alcance autorizado.
- **Gestión de compañía:** crear, editar, duplicar, usar plantillas, asignar por función/modalidad, abrir cupos, aprobar postulaciones, gestionar reemplazos y asistencia.
- **Supervisión del Cuerpo:** consultar todas sus compañías, cobertura y pendientes; gestión solamente con atribución explícita.
- **Operix Voluntario:** próximas guardias, confirmación/rechazo, vacantes elegibles, postulaciones, reemplazos y llegada/salida pendiente de validación. Reutilizar la app actual sin restringir su acceso general por rol.
- **Despacho, fase 5:** resumen informativo separado de disponibilidad real. Nunca actualizar disponibilidad de personas ni móviles por tener guardia cubierta.

## Diseño técnico propuesto

### Tablas nuevas

| Tabla propuesta | Contenido |
|---|---|
| guard_shifts | Organización, compañía, nombre, inicio/fin, modalidad, estado, motivo y responsables. |
| guard_slots | Turno, función, modalidad presencial/domiciliaria, franja, capacidad, criticidad y apertura para postular. |
| guard_assignments | Turno/cupo, voluntario, franja, confirmación y retiro/reemplazo, conservando historia. |
| guard_applications | Solicitante, cupo, estado, decisiones y motivos; pendientes no son confirmaciones. |
| guard_swap_requests | Titular, reemplazante o asignación contraparte, aceptaciones, aprobación y fechas. |
| guard_attendance_events | Llegada/salida, validación, observación y corrección como eventos inmutables vinculados. |
| company_guard_rules | Mínimos, requisitos y elegibilidad configurables por compañía, función y modalidad. |
| guard_templates | Plantillas versionadas con puestos y horarios relativos validados. |
| guard_permissions | Delegaciones protegidas por compañía/usuario/acción para gestionar y validar; nunca roles en perfiles. |
| guard_notification_outbox | Evento, destinatario calculado en servidor, clave idempotente y reintentos posteriores al commit. |

Todas las relaciones deben demostrar organización y compañía coherentes. La compañía de origen del voluntario y la receptora se distinguen cuando exista colaboración explícita; cerrada por defecto. Actores desde sesión, con UUID o referencia a perfiles públicos; sin FK nuevas a auth.users. FK históricas RESTRICT/NO ACTION, no eliminación operativa desde cliente.

Índices por organización, compañía, fecha, persona y estado; unicidad para solicitudes activas e idempotencia. Horarios completos con zona de la organización e intervalos [inicio, fin), incluyendo medianoche y cambios de hora.

### Migraciones propuestas, no ejecutadas

1. Estructura aditiva: tipos, índices, tablas, GRANT mínimos explícitos y RLS por cada tabla.
2. Helpers específicos de Guardias, antes de las políticas; comandos transaccionales para estados, asignaciones, postulaciones, reemplazos y asistencia.
3. Lectura privada de historial, entrega confiable y resumen informativo, según la fase correspondiente.

No tocar los helpers generales de despacho para conceder permisos de Guardias. Nuevas funciones privilegiadas con search_path fijo, identidad y parámetros validados, EXECUTE restringido y rechazo sin sesión. Tipos regenerados automáticamente mediante la herramienta autorizada.

### RLS y permisos

- **Lectura:** Cuerpo supervisa su organización; encargado su compañía; voluntario sus asignaciones, solicitudes y asistencia, más vacantes publicadas elegibles, sin listas privadas ajenas. Operador solo resumen informativo. Borradores para gestores/supervisores autorizados.
- **Escritura:** comandos transaccionales, sin GRANT o políticas de escritura directa que permitan saltarse las reglas. Verificar alcance de fila original y resultado; no cambiar organización/compañía histórica. Reglas y plantillas también mediante comandos.
- **Atribuciones:** administrador del Cuerpo supervisa por defecto; gestión de otras compañías solo con permiso explícito. Admin de compañía gestiona la propia. Oficial valida con alcance explícito. Prohibir autoaprobación y autovalidación incluso si el usuario también es gestor.
- **Identidad:** resolver la ficha del voluntario desde auth.uid(); entrar a la app sin ficha no autoriza postular ni marcar asistencia.
- **Historial:** audit_log dentro de la misma transacción; lector acotado por relaciones reales con Guardias, no JSON arbitrario ni acceso al historial completo de otras compañías.

### Concurrencia y reglas

- Aprobar bajo bloqueo de cupo/turno y persona; releer capacidad, elegibilidad y conflictos antes de guardar. Bloqueos deterministas de las personas implicadas para permutas.
- Todas las asignaciones, cambios de fechas y reemplazos usan el mismo control de solapamientos, también entre compañías. No depender de consultas previas del navegador.
- Asignaciones propuestas reservan capacidad hasta rechazo/retiro; pendientes de confirmación se muestran aparte. Solicitar reemplazo conserva reserva del titular; candidato no suma cobertura hasta aprobación.
- Si se añade exclusión GiST como segunda barrera, incluir btree_gist en propuesta de migración: actualmente no está instalada. No usarla como única validación.
- Estados: borrador→publicado/cancelado; publicado→en curso/cancelado; en curso→finalizado/cancelado. Estados terminales no se reabren por UPDATE arbitrario. Cancelación con motivo, sin borrar historia.
- Separar cobertura planificada, confirmada, domiciliaria y presencial validada; pendiente de postulación nunca confirmada, domicilio nunca presencia física.
- Llegada/salida requieren validación de otro oficial autorizado. Correcciones agregan eventos con referencia al anterior y motivo.
- Notificaciones privadas, discretas y sin observaciones personales en pantalla bloqueada; destinatarios resueltos por servidor. Outbox en transacción, entrega después del commit; reintento nunca repite asignación. Conservar tonos y flujo de emergencia actuales.

### Archivos previstos

Modificar src/App.tsx, AppLayout.tsx, VoluntarioApp.tsx y VoluntarioLayout.tsx para navegación. Crear páginas Guardias/GuardiaDetail y sus vistas de voluntario, componentes en src/components/guardias, hooks y guardiaPermissions/guardiaCoverage. Fase 4: transporte privado y consumidores push; fase 5: CompanyGuardiaSummary en DispatchConsole. No cambiar vehicleAvailability ni volunteers.available. Migraciones y tipos mediante herramientas; decisiones estructurales en AGENTS.md al implementar.

Informe ampliado: docs/guardias-auditoria-diseno.md.

## Fases y comprobaciones

| Fase | Entrega | Pruebas antes de avanzar |
|---|---|---|
| 1 | Modelo, RLS y comandos seguros | Compañía A/B y otra organización; actor falsificado; escritura directa de estado; autoaprobación/validación; relaciones inconsistentes. |
| 2 | Calendario, turnos y asignaciones | Día/semana/mes, medianoche, cambio de hora, inactivo/licencia y asignaciones incompatibles concurrentes; duplicación y transiciones. |
| 3 | Cupos, postulaciones y cobertura | Dos aprobaciones por último cupo: una sola exitosa; pendientes excluidas de confirmados, domicilio separado y mínimos configurables. |
| 4 | Asistencia, reemplazos y entrega | Validación por otro oficial, corrección conserva evento; permuta atómica, rechazo de conflictos; privacidad e idempotencia con fallos de entrega. |
| 5 | Supervisión y despacho informativo | Alcances reales, privacidad, resumen no cambia móviles; recorridos consola/voluntario y regresiones. |

Pruebas unitarias junto a src/test, más pruebas PostgreSQL/RLS y carreras con sesiones reales en entorno de prueba autorizado. Los mocks no prueban seguridad ni concurrencia. Cada fase entrega informe de resultados y compilación automática comprobada, sin declarar éxito sin evidencia ni crear/borrar datos operativos para probar.

## Autorización solicitada

**Auditoría completa; módulo aún no implementado.** Aprobar este plan autoriza empezar solamente la fase 1 y aplicar sus cambios aditivos. Antes de avanzar a la fase 2 se presentarán resultados y se solicitará autorización. No se publicará ni desplegará sin permiso explícito.