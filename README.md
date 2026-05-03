# Catalog Image Cleaner V1

Aplicación profesional para transformar fotos de producto en imágenes listas para vender. 
Ideal para emprendedores y comercios online.

## Estructura del Proyecto
- `backend/`: API FastAPI con `rembg` para eliminación de fondo.
- `frontend/`: Aplicación web interactiva con editor de Canvas.

## Prueba rápida (Local)
Seguí estos pasos para probar la app en menos de 2 minutos:

1. **Instalar Backend**: 
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. **Ejecutar Backend**:
   ```bash
   uvicorn main:app --port 8000
   ```
3. **Servir Frontend**:
   En una nueva terminal, entra a la carpeta `frontend` y ejecuta:
   ```bash
   python -m http.server 5500
   ```
4. **Abrir Frontend**: Navega a `http://localhost:5500` en tu navegador. (No abras el archivo index.html directamente para evitar errores de CORS).
5. **Subir imagen**: Arrastra cualquier foto de producto (JPG/PNG).
6. **Eliminar fondo**: Presiona el botón de carga y espera el proceso.
7. **Exportar PNG**: Selecciona "Fondo Transparente" y dale a "Descargar PNG".
8. **Confirmar**: Abre el archivo descargado y verifica que el fondo sea transparente.

## Características de la V1
- ✅ Eliminación automática de fondo con IA.
- ✅ Canvas de composición profesional.
- ✅ Fondos: Transparente, Blanco, Colores, Degradados.
- ✅ Sombras configurables.
- ✅ Ajuste de escala y márgenes.
- ✅ Presets de formato (Instagram, Mercado Libre).
- ✅ Exportación en PNG, JPG y WEBP.
- ✅ Diseño 100% Responsive (Móvil y Desktop).

## Roadmap V2 (Próximamente)
- 🎨 Pincel de borrado y restauración manual.
- 🖼️ Agregar logos y texto sobre la imagen.
- 📚 Historial de procesamiento local.
- 📦 Procesamiento por lotes (múltiples fotos).

## Despliegue
- **Backend**: Listo para Railway/Render (incluye Dockerfile y Procfile).
- **Frontend**: Puede servirse como sitio estático en Netlify, Vercel o GitHub Pages.

---
*Desarrollado con enfoque en simplicidad y calidad comercial.*
