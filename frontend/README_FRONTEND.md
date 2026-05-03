# Catalog Image Cleaner - Frontend

Interfaz web para el procesamiento y edición de imágenes de catálogo.

## Tecnologías
- HTML5
- CSS3 (Variables, Flexbox, Grid)
- JavaScript (Vanilla)

## Configuración
Para conectar con el backend, abre `app.js` y modifica `API_BASE_URL`:

```javascript
const API_BASE_URL = "http://localhost:8000"; 
```

## Ejecución Local
Para evitar errores de CORS, no abras `index.html` directamente como archivo. Usa un servidor local:

```bash
# Desde la carpeta frontend
python -m http.server 5500
```

Luego accede a: `http://localhost:5500`

## Características
- Gestión de estados (Idle, Processing, Editor, Error).
- Motor de composición en Canvas.
- Fondos sólidos, degradados y transparentes.
- Soporte para eventos touch en móviles (botón ver original).
- Exportación multi-formato.
- Diseño responsive para móviles.
