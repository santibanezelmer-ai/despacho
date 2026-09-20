# Mejora visual del módulo de Grifos

## Resultado
- Mantener el mapa operativo limpio y mostrar cada grifo con un marcador verde, amarillo, rojo o negro según su estado.
- Al seleccionar un grifo, abrir una ficha rápida con número, estado, bocas y diámetros destacados, caudal/presión, ubicación, última inspección y observaciones; cualquier dato ausente se mostrará como “Sin información”.
- Representar las bocas como una lista de salidas independientes: cada grifo podrá tener varias y cada una tendrá su propio diámetro (por ejemplo, una de 75 mm y otra de 100 mm).
- Incorporar una ficha completa lateral para consultar todos los datos sin abandonar el mapa.
- Agregar filtros compactos por estado y diámetro, además del control actual para mostrar u ocultar grifos.

## Datos y edición
- Ampliar los grifos propios de cada organización con campos opcionales: número, estado, lista de bocas con diámetro individual, caudal, presión, última inspección y observaciones.
- Actualizar el formulario existente para agregar o quitar bocas, definir el diámetro de cada salida y mostrarlas visualmente en la ficha rápida y completa.
- Los grifos nacionales conservarán solamente los datos existentes (ubicación, modelo, año y diámetros disponibles); no se completarán valores inventados y su estado será “Sin información” cuando no exista.
- No se crearán tablas nuevas ni se alterará el aislamiento entre organizaciones.

## Alcance técnico
- Reutilizar el mapa y las consultas actuales, cargando únicamente los campos necesarios y manteniendo la consulta por área visible para los grifos nacionales.
- Extender el marcador y la selección de grifos dentro del mapa compartido, sin cambiar emergencias, móviles, ubicación compartida, rutas ni lógica de despacho.
- Mantener controles accesibles, una leyenda clara y una presentación adaptable para escritorio y pantallas pequeñas.

## Verificación
- Comprobar los cuatro estados y la leyenda.
- Seleccionar grifos propios y nacionales, revisar ficha rápida y ficha completa, y confirmar el tratamiento de datos faltantes.
- Probar filtros por estado y diámetro, creación/edición y persistencia.
- Confirmar que emergencias, móviles, cuarteles, ubicación compartida y navegación del mapa siguen funcionando sin cambios.