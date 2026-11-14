# Use the official Playwright image based on Ubuntu 24.04 (Noble) with Python 3.12
FROM mcr.microsoft.com/playwright/python:v1.57.0-noble

# Set the working directory inside the container
WORKDIR /app

# Copy requirements first to leverage Docker caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (already installed in base image, but ensure)
RUN playwright install webkit

# Copy the entire backend folder
COPY . .

# Expose the port your app runs on (Render sets PORT env var)
EXPOSE 8000

# Run the FastAPI app with uvicorn
CMD ["uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "8000"]