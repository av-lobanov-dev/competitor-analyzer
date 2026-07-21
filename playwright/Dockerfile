FROM mcr.microsoft.com/playwright:v1.55.0-jammy

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev --no-audit --no-fund

COPY . .

CMD ["sleep", "infinity"]
