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
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
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
    # Basic validations
    validate_image(file)
    
    # Check size
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Max allowed is {MAX_UPLOAD_SIZE // (1024*1024)}MB.")

    try:
        # 3. Pillow Integrity Check
        image = Image.open(io.BytesIO(content))
        image.verify() # Verify it's a real image
        
        # Re-open after verify() because it closes the stream
        image = Image.open(io.BytesIO(content))
        
        # 4. Processing in Memory using lazy loaded session
        output_data = rembg.remove(content, session=get_rembg_session())
        
        return StreamingResponse(io.BytesIO(output_data), media_type="image/png")
        
    except Exception as e:
        print(f"Processing error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing image. Make sure it's a valid product photo.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
