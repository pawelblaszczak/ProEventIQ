FROM node:20 AS build

# 1. Instalacja Javy (niezbędna dla openapi-generator-cli)
RUN apt-get update && apt-get install -y default-jre && rm -rf /var/lib/apt/lists/*

# 2. Ustawiamy katalog roboczy na /app/frontend
WORKDIR /app/frontend

# 3. Kopiujemy folder api do /app/api (poziom wyżej niż /app/frontend)
# Dzięki temu ../api/proeventiq.yaml w skrypcie zadziała idealnie!
COPY api/ ../api/

# 4. Kopiujemy pliki frontendu
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

# 5. Kopiujemy resztę kodu frontendu
COPY frontend/ .

# 6. Generujemy API i budujemy projekt
RUN npm run gen-api
RUN npm run build -- --configuration production

# Etap serwowania (Nginx)
FROM nginx:1.27-alpine
# Upewnij się, czy Twoja ścieżka to /browser/ (nowy Angular tak ma)
COPY --from=build /app/frontend/dist/frontend/browser/ /usr/share/nginx/html/
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]