FROM mcr.microsoft.com/devcontainers/javascript-node:20

RUN apt-get update && apt-get install -y \
  ffmpeg \
  redis-server \
  xvfb \
  libnss3 \
  libatk1.0-0 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libpangocairo-1.0-0 \
  libxshmfence1 \
  fonts-liberation \
  chromium \
  && rm -rf /var/lib/apt/lists/*
