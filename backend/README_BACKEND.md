# Catalog Image Cleaner - Backend

API construida con FastAPI para la eliminación de fondos de imágenes de productos.

## Requisitos
- Python 3.9+
- Pip

## Instalación Local
1. Crear un entorno virtual: `python -m venv venv`
2. Activar entorno:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
3. Instalar dependencias: `pip install -r requirements.txt`
4. Copiar `.env.example` a `.env` y ajustar si es necesario.

## Ejecución
```bash
uvicorn main:app --reload --port 8000
```

## Endpoints
- `GET /health`: Estado de la API.
- `GET /warmup`: Precarga el modelo de IA.
- `POST /api/remove-background`: Recibe un archivo de imagen y devuelve un PNG transparente.

## Despliegue
Este backend está listo para Railway o Render usando el `Dockerfile` o `Procfile`. Asegúrate de configurar la variable de entorno `PORT` y `ALLOWED_ORIGINS`.
