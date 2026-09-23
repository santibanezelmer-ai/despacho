# Reorganización de Operaciones y Pantalla Central

## Operaciones

- Mantener la Consola de Despacho como acceso principal y retirar de ella los bloques de Comunicados / Notas y Emergencias Activas.
- Mantener Emergencias Activas como pantalla independiente en `/emergencias`, reutilizando sus tarjetas, estados, acciones, móviles, tiempos, funcionamiento offline y descarga de ficha existentes.
- Crear la vista independiente Comunicados / Notas en `/comunicados`, reutilizando `DispatchNotesPanel` y sus operaciones actuales de publicación y archivo.
- Agregar Comunicados / Notas al menú Operaciones, respetando los permisos y el orden solicitado: Consola, Emergencias Activas, Comunicados / Notas, Historial y Mapa Operativo.

## Pantalla Central

- Eliminar el listado de Emergencias Activas y su tarjeta de resumen de `/pantalla-central`; la pantalla seguirá usando las emergencias únicamente para calcular asignaciones, móviles en emergencia y disponibilidad operacional.
- Conservar el reloj, acceso al mapa, compartir, disponibilidad del personal de mando y móviles agrupados por compañía.
- Reorganizar el contenido en una cuadrícula de TV con altura fija al viewport, encabezado y resumen compactos, y paneles de personal y móviles distribuidos en el espacio restante.
- Aplicar autoajuste por tamaño de pantalla, truncado controlado y desplazamiento interno solo en listados extensos, evitando scroll vertical de la página y sin ocultar indicadores o datos operativos.

## Validación

- Comprobar que las cinco opciones aparezcan en el orden solicitado dentro de Operaciones.
- Confirmar que la Consola no muestre notas ni listado de emergencias.
- Confirmar que Emergencias Activas conserva tarjetas y acciones, y que Comunicados / Notas conserva publicación y archivo.
- Revisar Pantalla Central en formato TV y en una pantalla menor, verificando que el dashboard completo permanezca dentro del viewport.
- Verificar errores de compilación, navegación y consola sin cambiar consultas, Realtime, estados ni lógica de negocio.