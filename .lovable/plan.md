# Revisión de aislamiento por organización (RLS) — solo análisis

Revisé las 56 políticas de las 14 tablas prioritarias en la base de datos real. No hay cambios aplicados todavía.

## 1. Políticas inseguras encontradas

- **No hay** políticas `USING (true)` en estas tablas.
- **No hay** políticas que dependan solo de `has_role(auth.uid(), ...)`. Esas políticas antiguas ya se eliminaron en una limpieza anterior. Cada tabla tiene hoy exactamente 4 políticas (select/insert/update/delete), sin duplicados.

Aun así encontré **2 fugas reales entre organizaciones**:

**A. device_tokens (grave).** `dt_insert` y `dt_update` solo comprueban `auth.uid() = user_id`, no la organización. Un usuario de la Org. A podría registrar su teléfono con `organization_id = B`. El envío de avisos selecciona los teléfonos por organización, así que **recibiría las alertas de emergencia de la Org. B**, con dirección y datos del llamante.

**B. equipment (media).** En `eq_insert`, `eq_update` y `eq_delete`, la condición de administrador de compañía comprueba la organización del **móvil**, no la del equipo. Un administrador de compañía de la Org. A podría crear o modificar un equipo con `organization_id = B` si lo asocia a un móvil suyo. Esa fila quedaría visible en la Org. B.

## 2. Políticas que se mantienen (correctas)

- emergencies, emergency_vehicles, emergency_personnel, emergency_log, volunteers, vehicles, ranks, emergency_keys, hydrants, training: todas usan `get_my_organization_ids()`, `can_write_in_org()`, `has_org_role()` o `is_company_admin()` sobre el `organization_id` de la propia fila, con `is_superadmin()` como excepción.
- vehicle_devices: `is_org_member` / `has_org_role(admin)`, más el trigger que exige que el móvil sea de la misma organización.
- profiles: cada usuario ve el suyo; los administradores ven a los miembros activos de su organización; el superadmin ve todo.
- device_tokens `dt_select` y `dt_delete`: solo el dueño o el superadmin.
- equipment `eq_select`: correcta.

## 3. Políticas que se reemplazan (no se eliminan sin reemplazo)

- `dt_insert`, `dt_update` en device_tokens
- `eq_insert`, `eq_update`, `eq_delete` en equipment

## 4. SQL propuesto

```sql
-- device_tokens: el teléfono solo puede quedar ligado a una organización del propio usuario
DROP POLICY IF EXISTS dt_insert ON public.device_tokens;
CREATE POLICY dt_insert ON public.device_tokens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_org_member(organization_id));

DROP POLICY IF EXISTS dt_update ON public.device_tokens;
CREATE POLICY dt_update ON public.device_tokens FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_org_member(organization_id));

-- equipment: el móvil del admin de compañía debe ser de la misma organización del equipo
DROP POLICY IF EXISTS eq_insert ON public.equipment;
CREATE POLICY eq_insert ON public.equipment FOR INSERT TO authenticated
  WITH CHECK (is_superadmin() OR can_write_in_org(organization_id) OR EXISTS (
    SELECT 1 FROM vehicles v WHERE v.id = equipment.vehicle_id
      AND v.organization_id = equipment.organization_id
      AND is_company_admin(v.organization_id, v.company_id)));

DROP POLICY IF EXISTS eq_update ON public.equipment;
CREATE POLICY eq_update ON public.equipment FOR UPDATE TO authenticated
  USING (is_superadmin() OR can_write_in_org(organization_id) OR EXISTS (
    SELECT 1 FROM vehicles v WHERE v.id = equipment.vehicle_id
      AND v.organization_id = equipment.organization_id
      AND is_company_admin(v.organization_id, v.company_id)))
  WITH CHECK (is_superadmin() OR can_write_in_org(organization_id) OR EXISTS (
    SELECT 1 FROM vehicles v WHERE v.id = equipment.vehicle_id
      AND v.organization_id = equipment.organization_id
      AND is_company_admin(v.organization_id, v.company_id)));

DROP POLICY IF EXISTS eq_delete ON public.equipment;
CREATE POLICY eq_delete ON public.equipment FOR DELETE TO authenticated
  USING (is_superadmin() OR has_org_role(organization_id, 'admin') OR EXISTS (
    SELECT 1 FROM vehicles v WHERE v.id = equipment.vehicle_id
      AND v.organization_id = equipment.organization_id
      AND is_company_admin(v.organization_id, v.company_id)));
```

## 5. Impacto

- Operix sigue funcionando igual. La app registra el teléfono con la organización del propio usuario, y los equipos se crean con la organización del móvil, así que ambos casos siguen cumpliendo las nuevas reglas.
- El superadmin no pierde ningún acceso.
- Se cierran las dos únicas vías encontradas para escribir o recibir datos de otra organización.
- No cambian las tablas, los datos, las columnas, la aplicación ni las funciones del servidor.
- El registro de teléfonos que corregí antes ya valida la pertenencia a la organización, así que es compatible.
