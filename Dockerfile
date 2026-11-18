# syntax=docker/dockerfile:1

# Etap 1: Budowanie aplikacji (z generacją API)
FROM maven:3.9.8-eclipse-temurin-17 AS builder
WORKDIR /app

# Skopiuj cały projekt (żeby mieć dostęp do /api i /backend)
COPY . .

# Przejdź do backendu i zbuduj projekt
WORKDIR /app/backend
RUN --mount=type=cache,target=/root/.m2/repository,sharing=locked \
    for attempt in 1 2 3; do \
      mvn --batch-mode --no-transfer-progress \
        -Dmaven.wagon.http.retryHandler.count=5 \
        -Dmaven.wagon.http.retryHandler.requestSentEnabled=true \
        clean package -DskipTests && break; \
      if [ "$attempt" -eq 3 ]; then exit 1; fi; \
      find /root/.m2/repository -name "*.lastUpdated" -delete; \
      sleep $((attempt * 15)); \
    done

# Etap 2: Uruchamianie aplikacji
FROM eclipse-temurin:17-jdk-jammy
WORKDIR /app
COPY --from=builder /app/backend/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
