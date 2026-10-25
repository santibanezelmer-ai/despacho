# Guardias por Compañía — auditoría y propuesta de implementación

## Alcance y autorización

La fase 0 comprende inspección y diseño. No se modificaron tablas, datos, permisos, funciones desplegadas ni pantallas. Solo se registraron requisitos y tareas del proyecto.

Las fases 1–5 requieren autorización explícita. Aprobar este plan autoriza iniciar la fase 1; entregar su informe y pruebas antes de solicitar avanzar a la fase 2. No publicar ni desplegar funciones nuevas sin autorización.

## Hallazgos verificables

| Comprobación | Evidencia | Resultado |
|---|---|---|
| Existencia de guardias | Catálogo real `pg_tables`, búsqueda en tipos y repositorio | Hay 48 tablas públicas; ninguna administra guardias, plantillas de turnos ni cupos. |
| Entidades base | Columnas, restricciones e índices reales de organizations, companies, volunteers y organization_members | Reutilizables; no crear nuevos cuerpos, compañías, personas ni membresías. |
| Roles efectivos | Definiciones reales de funciones públicas y de sus implementaciones en app_private | `has_org_role(org, role)` y `can_write_in_org(org)` exigen membresía activa sin alcance de compañía; `is_company_admin(org, company)` exige admin activo de esa compañía. |
| Identidad de voluntario | Esquema y VoluntarioApp | `volunteers.user_id` es único cuando no es nulo; la entrada a la app puede permitirse sin ficha, pero postular exige una ficha elegible vinculada al usuario autenticado. |
| Integridad territorial | FK e índices de companies, volunteers, organization_members | Las FK simples no demuestran por sí solas que compañía, voluntario y organización coincidan; Guardias necesita controles adicionales. companies y volunteers tienen organización inmutable mediante trigger. |
| Seguridad existente | `pg_policies` y privilegios efectivos | RLS habilitada. Algunas lecturas actuales abarcan la organización, incluso para admin de compañía; no reutilizarlas como privacidad de Guardias. Los privilegios existentes son amplios, pero las políticas limitan el acceso; no implican acceso anónimo permitido. |
| Auditoría | `audit_log` y definición real de `insert_audit_log` | Actor derivado de `auth.uid()`; lectura para superadmin/admin del Cuerpo, no admin de compañía. Una llamada independiente desde la interfaz no garantiza auditoría atómica ni contenido auténtico del cambio. |
| Asistencia existente | emergency_attendance y emergency_personnel | Participación en emergencias, no llegada/salida de guardias ni validación presencial; conservarlas intactas. |
| Notificaciones | send-push-notification, pushService y VoluntarioApp | Transporte de tokens reutilizable; envío actual por organización orientado a emergencias/comunicados, no a asignaciones privadas. No reutilizar el envío masivo para Guardias. |
| Calendario y diseño | componentes ui, AppLayout y useScreenTheme | Existen formularios, tablas, diálogos, selector de fechas y tema; falta calendario operativo diario/semanal/mensual. |
| Regresión existente | `bunx vitest run src/test/volunteerAccess.test.tsx src/test/mobileVolunteerRouting.test.tsx src/test/vehicleReturn.test.ts src/test/operationalPreReports.test.tsx` | 42/42 pruebas aprobadas en 4 archivos. Son pruebas existentes, no validación de Guardias ni de RLS real. |

Las consultas fueron SELECT de metadatos, sin acceder a datos personales. No se ejecutaron mutaciones ni verificaciones autenticadas de un módulo inexistente. Los registros de diagnóstico disponibles no aportaron una comprobación nueva de compilación; no se declara compilación verificada en esta fase.

## Diferencias respecto de la auditoría anterior

Se contrastó el informe del 25 de octubre con el catálogo y funciones reales:

- Se confirma la ausencia de Guardias y la posibilidad de reutilizar entidades base.
- Su SQL ilustrativo invocaba funciones con firmas incorrectas: `is_org_member` recibe un UUID, `has_org_role` dos argumentos e `is_company_admin` dos UUID. No aplicar aquel SQL.
- Faltaban GRANT explícitos y políticas específicas; una política FOR ALL y lectura para cualquier miembro no satisfacen separación entre compañías ni acciones personales.
- Proponía ON DELETE CASCADE sobre historial y referencias nuevas a auth.users: sustituir por conservación histórica y actores referenciados a perfiles públicos o UUID.
- Cuatro tablas no cubren postulaciones, capacidad por franja, asistencia validada, plantillas y entregas confiables.
- UNIQUE(turno, voluntario) no previene solapamientos entre turnos ni carreras por el último cupo.
- El nuevo documento resuelve las decisiones anteriores: cupos con postulación y aprobación, Recursos → Guardias, llegada/salida manual con validación de oficial, sin GPS obligatorio.
- No imponer mínimos universales, acceso de gestión global al admin del Cuerpo, geocerca ni supuestos de capacidad de salida de móviles.

## Experiencia propuesta

- **Recursos → Guardias:** calendario Día/Semana/Mes y alternativa de lista; selección de compañía únicamente dentro del alcance permitido.
- **Gestión de compañía:** turnos, duplicación, plantillas, puestos por franja y modalidad, confirmaciones, postulaciones, reemplazos, asistencia e historial.
- **Supervisión del Cuerpo:** todas sus compañías, cobertura y pendientes; gestión solo con atribución explícita.
- **Operix Voluntario:** próximas asignaciones, confirmación/rechazo, vacantes autorizadas, postulaciones, reemplazos y llegada/salida con estado de validación. Mantener la app actual y su acceso para todos los roles válidos.
- **Despacho, fase 5:** resumen informativo de guardia por compañía y fecha de actualización, sin datos personales innecesarios. Fallos del resumen no bloquean despacho.

## Modelo de datos propuesto — detalles técnicos

Nombres propuestos tras comprobar que no existen estructuras equivalentes:

| Tabla nueva | Contenido y controles principales |
|---|---|
| `guard_shifts` | Organización, compañía, nombre, inicio/fin timestamptz, modalidad mixta/presencial/domiciliaria, estado, motivos y responsables. Fin mayor que inicio; estado inicial borrador. |
| `guard_slots` | Turno, organización, compañía, función, modalidad presencial/domiciliaria, franja, capacidad positiva, puesto crítico, requisitos y apertura para postular; franja contenida en turno. |
| `guard_assignments` | Cupo, turno, organización, compañía receptora, voluntario, franja y modalidad, confirmación, retiro/reemplazo; separar confirmación de asistencia y conservar asignaciones retiradas. |
| `guard_applications` | Cupo, solicitante derivado de sesión, estado, fechas, decisión y motivo. Una postulación activa por voluntario/cupo; pendientes no consumen asignación confirmada. |
| `guard_swap_requests` | Asignación original, reemplazante propuesto o asignación contraparte para permuta, aceptación de participantes, decisión de jefatura, fechas y motivo; conservar titular original. |
| `guard_attendance_events` | Eventos inmutables de llegada/salida, validación, observación y corrección; referencia a asignación y evento anterior, autor/validador, fecha y motivo. Correcciones agregan eventos, no sobrescriben. |
| `company_guard_rules` | Requisitos configurables por compañía, función y modalidad; criterios explícitos de elegibilidad y apertura. Sin mínimos universales obligatorios. |
| `guard_templates` | Compañía, versión, nombre y especificación validada de puestos/horarios relativos; duplicar no copia confirmaciones ni asistencia. |
| `guard_permissions` | Delegaciones protegidas por organización/compañía/usuario/acción: gestionar, validar asistencia y habilitar colaboración entre compañías. No roles en perfiles ni permisos editables por el beneficiario. |
| `guard_notification_outbox` | Evento y destinatario resueltos en servidor, clave idempotente, entrega/reintentos; creada en la transacción del cambio y procesada después del commit. |

Todas las filas se relacionan con su organización y contexto real; UUID de actores desde sesión, nunca desde parámetros de identidad. No FK nuevas a auth.users. Usar FK compuestas donde corresponda, índices únicos de soporte aditivos en entidades base y triggers para comprobar voluntario/organización/compañía y delegaciones. Relaciones históricas RESTRICT/NO ACTION; no DELETE operativo desde cliente.

Índices: organización+compañía+inicio/estado para calendario; turno/cupo+estado para asignaciones/postulaciones; voluntario+franja para conflictos; asignación+fecha para eventos; compañía+acción+usuario para permisos; estado+próximo intento para outbox. Unicidad parcial para solicitudes activas e idempotencia.

Horarios almacenados como instantes completos; intervalos `[inicio, fin)` permiten turnos consecutivos, incluidos cruces de medianoche. Presentar zona de la organización, con America/Santiago como valor inicial para las actuales de Chile; validar horas ambiguas/inexistentes de cambio de hora sin inventar duración.

## Seguridad, transacciones y migraciones propuestas

1. **Migración aditiva de estructura:** tipos/estados, índices de integridad de soporte, tablas, GRANT mínimos explícitos y RLS por tabla. Sin cambios destructivos ni datos de prueba en producción.
2. **Migración de acciones y políticas:** helpers de Guardias antes de las políticas que los usan; RPC por comando para transiciones, asignación, postulación, aprobación, reemplazo y asistencia. SECURITY DEFINER con search_path fijo, parámetros validados, EXECUTE solo para roles previstos y rechazo sin sesión. No debilitar helpers actuales de despacho.
3. **Migración de historial y entrega:** lectura acotada de historial de Guardias reutilizando audit_log, outbox y resumen seguro. No ampliar acceso al historial completo de otras compañías.

**Lectura RLS:** admin del Cuerpo supervisa su organización; encargado solo su compañía; voluntario sus asignaciones/solicitudes/eventos y vacantes publicadas elegibles, sin listas privadas ajenas. Operador obtiene solo resumen informativo. Borradores solo para gestores/supervisores autorizados.

**Inserción/actualización:** escritura operacional únicamente mediante comandos transaccionales, con privilegios directos del cliente restringidos; sin políticas permisivas de INSERT/UPDATE/DELETE como vía alternativa. Los comandos revisan alcance de la fila original y del resultado, impiden cambiar organización/compañía de registros históricos y derivan actor de auth.uid(). Plantillas y reglas también usan comandos. Outbox no accesible al cliente; lectura solo por transporte autorizado.

**Atribuciones por defecto:** admin del Cuerpo supervisa, sin conceder automáticamente gestión ajena; admin de compañía gestiona la propia. Oficiales solo validan con alcance explícito. No autoaprobación de postulaciones, reemplazos ni asistencia, aunque el solicitante también sea gestor. Colaboración entre compañías cerrada por defecto, ampliable con regla explícita; los conflictos se comprueban igualmente en todas las compañías.

**Concurrencia:** bloqueo de cupo y turno durante aprobación; bloqueo estable por persona durante todas las asignaciones, cambios de fecha y reemplazos, con orden determinista para permutas. Releer capacidad, estado activo/licencia y solapamientos bajo bloqueo antes de guardar. Si procede añadir exclusión GiST como segunda barrera, proponer btree_gist en la migración: actualmente no está instalada. No depender de ella como única defensa ni de consultas del navegador.

Las asignaciones propuestas reservan capacidad hasta rechazo/retiro; confirmaciones pendientes se muestran aparte. Solicitar reemplazo mantiene reserva del titular; el candidato no cuenta en cobertura hasta aprobación. Aceptaciones y aprobación vuelven a validar conflictos. Cancelar libera reservas conservando historia. Turnos finalizados/cancelados no se reabren mediante UPDATE arbitrario; transiciones permitidas: borrador→publicado/cancelado, publicado→en curso/cancelado, en curso→finalizado/cancelado, siempre con permisos y motivo cuando corresponda.

**Notificaciones:** reutilizar registro de tokens y transporte, no envío masivo de emergencias. Destinatarios calculados por evento y permisos; mensajes discretos, sin observaciones personales en pantalla bloqueada y enlaces al turno autorizado. Reintentar entrega nunca repite asignación. Audit_log se escribe dentro de la misma transacción; lectura por compañía mediante relación comprobada con registros de Guardias, no filtrado inseguro de JSON enviado por cliente.

## Archivos previstos

- Modificar `src/App.tsx`, `src/components/layout/AppLayout.tsx`, `src/pages/voluntario/VoluntarioApp.tsx` y `VoluntarioLayout.tsx` para navegación y vistas existentes.
- Crear `src/pages/Guardias.tsx`, `GuardiaDetail.tsx`, vistas `VoluntarioGuardias`/`VoluntarioGuardiaDetail`, componentes pequeños en `src/components/guardias/`, hooks y reglas de interfaz/cobertura en `src/lib/guardiaPermissions.ts` y `guardiaCoverage.ts`.
- En fase 4, adaptar consumidores de push y crear transporte privado para Guardias; conservar comportamiento de emergencia y registro nativo compartido.
- En fase 5, crear `CompanyGuardiaSummary` e incorporarlo a DispatchConsole. No tocar vehicleAvailability ni volunteers.available para derivar operatividad.
- Migraciones mediante herramienta autorizada; tipos regenerados automáticamente, no editados a mano. Registrar decisiones estructurales en AGENTS.md al implementarlas.

## Fases y pruebas de aceptación

| Fase | Entrega | Comprobación antes de avanzar |
|---|---|---|
| 1 | Modelo, RLS, comandos y seguridad | Matriz autenticada de compañía A/B y organización distinta; actor falsificado; manipulación directa de estado; autoaprobación/validación; integridad de relaciones. |
| 2 | Calendario, turnos y asignaciones | Día/semana/mes, medianoche, cambios de hora, voluntario inactivo/licencia, dos sesiones asignando franjas incompatibles; transiciones y duplicación. |
| 3 | Cupos, postulaciones y cobertura | Dos aprobaciones concurrentes por último cupo: solo una exitosa; pendientes no confirmadas; modalidad domiciliaria nunca presencia física; mínimos configurables. |
| 4 | Asistencia, reemplazos y entrega | Llegada/salida pendientes→validación por otro oficial; corrección conserva evento; permuta atómica; candidatos incompatibles; envío privado e idempotente con fallos/reintentos. |
| 5 | Supervisión y resumen de despacho | Cuerpo ve solo su organización; gestor solo compañía; resumen no expone detalles personales ni altera móviles; recorridos reales consola/voluntario y regresiones existentes. |

Pruebas nuevas junto a src/test: permisos, cobertura, acciones, rutas y notificaciones. Pruebas de PostgreSQL/RLS y carreras con sesiones auténticas en entorno de prueba autorizado; mocks no prueban seguridad ni concurrencia. Cada fase entrega resultados reales, comprobación automática de compilación y limitaciones; nunca declarar éxito sin evidencia. No crear ni borrar datos operativos existentes para probar.

**Estado:** auditoría y diseño completos; funcionalidades y permisos nuevos todavía no implementados ni probados. Fase 1 pendiente de autorización.