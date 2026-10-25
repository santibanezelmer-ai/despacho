# Guardias — validación acotada

## Cambio mínimo, no instalado

`docs/sql/05_guardias_atomic_draft_v3.sql` añade solo `guard_create_draft`:
argumentos `_org uuid, _company uuid, _name text, _start timestamptz, _end timestamptz, _mode text, _slots jsonb`, retorno UUID.
Reutiliza `guard_create_shift` y `guard_create_slot` intactos en una sola llamada/transacción.
SECURITY INVOKER, actor derivado por las funciones v3, sin permisos nuevos de propietario.
Cualquier error de cupo, conversión o auditoría revierte turno, cupos y eventos juntos;
no hay borrado compensatorio. Mantiene el límite de lote de guard_replace_shift.

El contrato `createDraft` está preparado, sin transporte; executeDutyCommand continúa rechazando escrituras.
La pantalla no cambia. Nunca encadenar los RPC individuales para guardar el borrador completo.
No se promete idempotencia: una respuesta perdida requiere reconciliar lectura antes de reintentar, no reintento automático.

## Sesiones reales: matriz preparada, NO ejecutada

En entorno aislado autorizado, organización O con compañías A/B y otra organización X.
Cuatro cuentas distintas, acceso por auth real y sus propios tokens; nunca simular JWT ni alterar rol en navegador.

| Cuenta | Lectura esperada | Acciones esperadas |
|---|---|---|
| Admin del Cuerpo sin manage | Supervisión A/B, nunca X | Crear atómicamente denegado; delegar denegado sin designación de emisor. |
| Emisor designado, sin manage | Supervisión A/B, nunca X | Delegar a otro admin elegible permitido; autodelegación y delegar B a admin A denegadas; crear sin manage denegado. |
| Admin A | Sin concesión: no turnos; con manage A: solo A | Crear A permitido solo con concesión; B/X denegados. Publicar/asignar A permitido; cancelar requiere motivo. Revocación bloquea nueva creación. |
| Voluntario A con ficha propia | guard_my_assignments(O): solo asignaciones propias no borrador; tablas completas sin filas | Crear/publicar/asignar/delegar denegados; confirmar asignación propia publicada permitido; confirmar ajena denegado. Confirmar no es autoaprobar postulaciones ni validar asistencia: no existen esos RPC en Fase 1. |

### Evidencia mínima

1. Verificar firma y ACL efectivo: authenticated ejecuta el RPC nuevo; anon/service_role/sandbox_exec no.
2. Admin A autorizado envía dos cupos válidos: UUID, un borrador, dos cupos y tres eventos con actor real.
3. Primer cupo válido y segundo inválido: error y cero incremento de turno/cupos/auditoría. Observar con supervisor y observador privilegiado aislado, no deducir rollback solo de filas ocultas por RLS.
4. Ejecutar cada lectura y denegación de la matriz, incluyendo X, y registrar cuenta de prueba, hora, RPC y lectura posterior sin guardar tokens.
5. Leer cambios con cada sesión; después de superar auth/Data API, conectar transporte en trabajo posterior y repetir desde la pantalla crear → leer → publicar → asignar → confirmar → cancelar, con auditoría. No declarar verificado ese recorrido desde la pantalla bloqueada actual.

**Único bloqueo de habilitación:** autorización para instalar y validar en entorno aislado con sesiones reales.
Orden, en una transacción autorizada: candidata existente `01_guardias_schema_rls_v2.sql` →
`02_guardias_commands_v2.sql` → `03_guardias_integrity_v2.sql` → complemento `05_guardias_atomic_draft_v3.sql`.
El preflight 04 es solo lectura y previo; el fixture nunca se instala en el destino.
No se ha aplicado SQL ni modificado producción.