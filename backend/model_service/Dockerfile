FROM python:3.10-slim

WORKDIR /app

# Исправленный список системных зависимостей
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    git \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# 1. Устанавливаем PyTorch CPU (обязательно до установки SAM2)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# 2. Устанавливаем SAM 2
RUN git clone https://github.com/facebookresearch/segment-anything-2.git /sam2
WORKDIR /sam2
RUN pip install -e .

# 3. Настройка приложения
WORKDIR /app
COPY requirements.txt .
# Совет: используйте в requirements.txt opencv-python-headless вместо opencv-python, 
# тогда библиотек выше понадобится еще меньше.
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app /app
ENV PYTHONPATH=/app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]