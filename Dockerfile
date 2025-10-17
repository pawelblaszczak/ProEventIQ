# Etap 1: Budowanie aplikacji (z generacją API)
FROM maven:3.9.8-eclipse-temurin-17 AS builder
WORKDIR /app

# Skopiuj cały projekt (żeby mieć dostęp do /api i /backend)
COPY . .

# Przejdź do backendu i zbuduj projekt
WORKDIR /app/backend
RUN mvn clean package -DskipTests

# Etap 2: Uruchamianie aplikacji
FROM eclipse-temurin:17-jdk-jammy
WORKDIR /app
COPY --from=builder /app/backend/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
