# Guardias — integración v3 sin instalación

La pantalla y su diseño no cambian. `src/lib/companyDuty.ts` conserva los contratos exactos existentes y añade `createDraft` para el complemento atómico pendiente, sin transporte de red. `executeDutyCommand` rechaza siempre: no detecta instalación ejecutando comandos, no guarda en memoria/localStorage y no concede permisos. `CompanyDuty.tsx` reutiliza el aviso centralizado; las operaciones siguen deshabilitadas.

## Contratos existentes

| Acción | RPC | Resultado |
| --- | --- | --- |
| Crear turno y todos sus cupos (complemento pendiente) | guard_create_draft | UUID |
| Crear turno | guard_create_shift | UUID |
| Crear cupo | guard_create_slot | UUID |
| Publicar / cancelar | guard_transition | void |
| Asignar | guard_assign | UUID |
| Confirmar / rechazar | guard_confirm | void |

Los argumentos están tipados en `dutyRpcContract`. No se envía actor: SQL lo obtiene de `auth.uid()`. No se incluyen comandos para conceder derechos ni designar emisores en la interfaz. La política se conserva: superadmin designa emisor y este delega a otra persona; rol/membresía ordinaria no concede gestión.

## Instalación requerida (no realizada)

Reutilizar los archivos del paquete candidato existente; los sufijos v2 identifican los nombres originales, su contenido es v3:

1. Revisar `sql/04_preflight_solo_lectura.sql` antes de instalar (solo lectura, no es migración).
2. Tras autorización explícita, aplicar en una sola transacción:
   1. `sql/01_guardias_schema_rls_v2.sql`
   2. `sql/02_guardias_commands_v2.sql`
   3. `sql/03_guardias_integrity_v2.sql`
   4. Complemento mínimo `docs/sql/05_guardias_atomic_draft_v3.sql` del proyecto.

No aplicar `pruebas/00_fixture_contrato_acl.sql` ni el paquete v2-original al destino. La candidata no se regenera; solo se prepara el complemento atómico. No se inspeccionó ni modificó el destino en este trabajo.

## Validación mínima antes de habilitar

En entorno aislado autorizado, con sesiones reales de administrador del Cuerpo, administrador de compañía, oficial y voluntario:
- Confirmar existencia/firma y EXECUTE de los RPC, RLS y privilegios efectivos del esquema instalado.
- Confirmar emisor designado y delegación explícita sin autodelegación; compañía ajena denegada, supervisión del Cuerpo y asignaciones propias según SQL.
- Crear turno y cupos, publicar, asignar, confirmar y cancelar, y leer el resultado de cada acción desde la interfaz con la sesión correspondiente; verificar auditoría y compatibilidad de administración/invitaciones.
- Guardar turno y cupos con una sola llamada a `guard_create_draft`, nunca encadenando los RPC individuales. Convertir `datetime-local` a instantes con zona horaria antes de llamar RPC; recoger campos de cupo (`critical`, `specialties`) y motivos que hoy no pide la preparación. La matriz concreta de cuatro sesiones reales y evidencias está en `docs/guardias-validacion-permisos-v3.md`.

No hay RPC de disponibilidad/readiness en la candidata. La existencia de funciones o un rol admin no autoriza habilitar botones. La conexión de transporte, consulta y acciones de la pantalla queda pendiente hasta validar SQL y autorización real; no se declara verificado un recorrido operativo real.