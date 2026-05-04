import os
import io
import time
from typing import List
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image
import rembg
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Catalog Image Cleaner API")

# Configuration
PORT = int(os.getenv("PORT", 8000))
MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_MB", 10)) * 1024 * 1024
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5500,http://localhost:5173,http://127.0.0.1:5500,http://127.0.0.1:8000").split(",")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy loading for rembg session
session = None

def get_rembg_session():
    global session
    if session is None:
        session = rembg.new_session()
    return session

def validate_image(file: UploadFile):
    # 1. Validate Extension safely
    filename = file.filename or ""
    if "." not in filename:
        raise HTTPException(status_code=400, detail="File must have a valid extension.")
    
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext not in ["jpg", "jpeg", "png", "webp"]:
        raise HTTPException(status_code=400, detail=f"Extension .{ext} not allowed. Use JPG, PNG or WEBP.")
    
    # 2. Validate Content-Type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File is not an image.")

@app.get("/health")
async def health():
    # Health check remains lightweight (no model loading)
    return {"status": "ok", "timestamp": time.time()}

@app.get("/warmup")
async def warmup():
    """Triggers model pre-loading by running a dummy process"""
    try:
        dummy_img = Image.new('RGB', (10, 10), color='red')
        img_byte_arr = io.BytesIO()
        dummy_img.save(img_byte_arr, format='PNG')
        rembg.remove(img_byte_arr.getvalue(), session=get_rembg_session())
        return {"status": "model_warmed_up"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Warmup failed: {str(e)}")

@app.post("/api/remove-background")
async def remove_background(file: UploadFile = File(...)):
    start_time = time.time()
    validate_image(file)
    
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Max allowed is {MAX_UPLOAD_SIZE // (1024*1024)}MB.")

    try:
        # 1. Abrir y convertir a RGBA
        image = Image.open(io.BytesIO(content))
        original_size = image.size
        
        # Asegurar modo compatible
        if image.mode != "RGBA":
            image = image.convert("RGBA")
            
        # 2. Redimensionar si es muy grande (Máx 1280px en el lado mayor)
        max_size = 1280
        if max(image.size) > max_size:
            ratio = max_size / max(image.size)
            new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
            # Usar Resampling.LANCZOS para máxima calidad
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        
        resized_size = image.size
        
        # 3. Preparar buffer para rembg (convertir a bytes PNG)
        input_buf = io.BytesIO()
        image.save(input_buf, format="PNG")
        input_data = input_buf.getvalue()
        
        # 4. Procesar con rembg usando la sesión lazy
        try:
            output_data = rembg.remove(input_data, session=get_rembg_session())
        except Exception as re_err:
            print(f"Error crítico en rembg: {str(re_err)}")
            raise HTTPException(status_code=500, detail="El motor de IA falló al eliminar el fondo. Intentá con una imagen más simple.")

        process_time = time.time() - start_time
        
        # Logs de control para Railway
        print(f"--- LOG: Procesamiento Exitoso ---")
        print(f"Original: {original_size[0]}x{original_size[1]}")
        print(f"Redimensionada: {resized_size[0]}x{resized_size[1]}")
        print(f"Tiempo: {process_time:.2f}s")
        
        return StreamingResponse(io.BytesIO(output_data), media_type="image/png")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error general de procesamiento: {str(e)}")
        raise HTTPException(status_code=500, detail="No se pudo procesar la imagen. Asegurate de que el archivo sea válido.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
