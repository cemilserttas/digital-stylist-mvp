FROM python:3.13-slim
WORKDIR /app

# libgomp1 required by onnxruntime (rembg background removal)
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p uploads

# Pre-download the rembg u2net model at build time so first upload is fast
RUN python -c "from rembg import new_session; new_session('u2net')" || true

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
