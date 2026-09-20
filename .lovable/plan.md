# Reorganizar la ventana Acciones

## Objetivo
Convertir la ventana larga actual en una herramienta compacta y fácil de recorrer, evitando que el mapa capture el desplazamiento de la página.

## Cambios
- Dividir el contenido en pestañas claras: **Ubicación**, **Móviles y personal**, **Preinforme** y **Acciones operativas**.
- Abrir por defecto **Ubicación**, reuniendo dirección, teléfono, solicitud de ubicación, coordenadas manuales y mapa en un mismo lugar.
- Mantener el encabezado visible y mostrar la dirección sin ocupar demasiado espacio.
- Ajustar el mapa a una altura contenida y adaptable, con sus botones siempre cercanos.
- Desactivar el zoom del mapa con la rueda del mouse para que el desplazamiento siga moviendo la ventana; el zoom seguirá disponible con los controles `+` y `−`.
- Mantener intactos los guardados, asignaciones, retornos, ubicación compartida y acciones operativas existentes.

## Resultado esperado
La persona operadora podrá cambiar de módulo sin recorrer una ventana extensa y podrá marcar o corregir una ubicación sin quedar atrapada en el mapa al hacer scroll.

## Verificación
- Revisar la ventana en escritorio y ancho reducido.
- Confirmar navegación entre pestañas, apertura y cierre del mapa, colocación/arrastre del marcador y desplazamiento normal sobre el mapa.
- Confirmar que el proyecto compile sin errores.
