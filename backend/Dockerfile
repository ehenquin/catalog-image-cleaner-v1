FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for rembg and Pillow
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Set dynamic port environment variable
ENV PORT=8000

# Pre-download the model (optional but recommended for speed)
RUN python -c "import rembg; rembg.new_session()"

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
