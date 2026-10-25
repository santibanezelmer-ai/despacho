# Roadmap

- [ ] Guardias, cierre acotado: complemento atómico turno/cupos y matriz concreta de permisos, pruebas nuevas locales; sin aplicar SQL ni habilitar escrituras.
- [x] Guardias, contratos v3 preparados sin transporte ni cambios de diseño/destino; pruebas de integración segura nuevas ejecutadas.
- [ ] Guardias, conectar consultas y operaciones reales: requiere instalación autorizada de SQL 01→02→03 y validación de permisos con sesiones reales en entorno aislado; tratar borradores parciales de turno/cupos.
- [x] Guardias, fase 0: esquema y permisos reales auditados, diferencias contrastadas, diseño y pruebas preparados; 42 pruebas existentes aprobadas, sin cambios de producción.
- [x] Guardias, revisión previa de fase 1: SQL completo y explicación de políticas/GRANT, funciones, índices, restricciones y riesgos entregados; creación y pruebas de seguridad en PostgreSQL desechable aprobadas, no equivalen a verificación real. Sin cambios en producción.
- [x] Guardias, revisión adicional: contrato y privilegios reales revisados, cuatro carreras locales verificadas, SQL v2 e informe preparados; autodelegación prohibida por decisión de Susana, sin cambios de destino.
- [x] Guardias, cierre de candidata: G-04/G-07 y reemplazo propuestos; 44 comprobaciones locales aprobadas y v3 entregada, sin aplicar; sesiones reales pendientes.
- [x] Guardias, interfaz Recursos y consulta personal implementada sin operaciones SQL ni datos ficticios; 19 pruebas aprobadas y compilación correcta.
- [ ] Guardias, verificación visual autenticada: falta sesión de la solicitante en la vista previa; no fue posible obtener su sesión propia.
- [ ] Guardias, fases 1–5: implementar por fases después de autorización explícita; bloqueado hasta aprobación.

- [x] Evitar fallos silenciosos de TV: solicitud con límite de tiempo, validación, aviso y reintento; recuperación a PIN real comprobada y 4 pruebas aprobadas.
- [ ] Verificar ventanas locales y TV vinculada con la cuenta de Susana: falta iniciar sesión en la vista previa; no fue posible obtener su sesión de prueba.

- [x] Compartir lectura de grifos entre organizaciones sin ampliar permisos de modificación; políticas verificadas, 3 pruebas aprobadas y consulta autenticada de 36 registros de otra organización comprobada en el mapa.

- [x] Sustituir rutas móviles antiguas por Voluntarios y conservar push; 15 pruebas de rutas aprobadas, compilación automática correcta y acceso sin sesión verificado.
- [ ] Verificar navegación de Voluntarios con sesión real en dispositivo nativo: requiere iniciar sesión en la vista previa y disponer del dispositivo.

- [x] Mostrar la confirmación de cierre por encima del personal y oscurecer el fondo.
- [x] Incluir nombre e ID de la emergencia en la ficha PDF descargable.
- [x] Equilibrar el tema blanco de Consola de Despacho: menú lateral, bordes y controles en la misma paleta.
- [x] Separar Consola, Emergencias Activas y Comunicados / Notas en vistas independientes de Operaciones, reutilizando sus componentes actuales.
- [x] Convertir Pantalla Central en un dashboard de TV sin ningún elemento visual de Emergencias Activas ni scroll de página.
- [x] Validar navegación, orden del menú, acciones operativas, consola del navegador, compilación y ajuste completo según viewport.
- [ ] Reorganizar Acciones en pestañas sin ocultar información crítica.
- [ ] Integrar controles de ubicación y mapa en dos columnas de escritorio y una en móvil.
- [ ] Validar el recorrido operativo completo indicado por la usuaria.
- [x] Mejorar el módulo de Grifos con estados visuales, ficha rápida, ficha completa y filtros.
- [x] Ampliar los datos propios de grifos con campos operacionales opcionales, sin inventar datos históricos.
- [x] Permitir múltiples bocas por grifo, cada una con su diámetro individual y presentación visual clara.
- [x] Validar visualmente el mapa de grifos y confirmar que despacho, emergencias y rutas siguen intactos.
- [x] Incorporar estados y ficha rápida de grifos en la segunda pantalla “Mapa” de Pantalla Central.
- [ ] Ampliar y reorganizar la ventana del Mapa Operativo para evitar controles angostos.
- [x] Aislar el reloj de la Consola de Despacho para evitar re-renders por segundo.
- [x] Usar Realtime para emergencias, móviles y voluntarios con polling solo de reconciliación.
- [x] Carga diferida de módulos pesados (mapas, pantalla central, dashboard, auditoría, exportaciones).
- [x] Memoizar tarjetas y paneles de la consola para reducir re-renders.
- [x] Permitir corregir manualmente una ubicación compartida y bloquear sobrescrituras automáticas.
- [x] Panel de Personal en la consola para cambiar estado y disponibilidad con auditoría.
- [x] Validar móviles pendientes (KM obligatorio) antes de finalizar una emergencia.
- [x] Corrector ortográfico nativo (es-CL) en los campos de texto del despacho.
- [x] Zoom con la rueda del mouse sobre el mapa de la ventana de despacho.
- [x] Claves de estado por móvil (6-3, 6-7, 6-9, 6-10) controladas individualmente en la consola.
- [x] Mantener en app móvil y voluntarios solo despachada / en trabajo / controlada / finalizada.
- [x] Landing: CTA demo/llamada, "Operix en operaciones reales", tarjeta radio VHF/UHF, FAQ offline/radio/demo, Plan Global Institucional, footer Comercial Hels SpA.
- [x] Pantalla Central: selector de vistas y pantallas remotas por código sin inicio de sesión (/tv).
- [x] Acceso multirrol a Operix Voluntario (admin/operador/oficial/voluntario/visor)
