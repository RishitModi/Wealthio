FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Generate ML models/artifacts during build
RUN python training/train_kmeans.py
RUN python data/collect_data.py

# Expose port
EXPOSE 8000

# Run the FastAPI application
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
