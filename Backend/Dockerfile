FROM --platform=linux/amd64 maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -q -DskipTests package

FROM --platform=linux/amd64 maven:3.9-eclipse-temurin-21
WORKDIR /app
COPY --from=build /app/target/safetrack-api-1.0.0.jar app.jar
RUN mkdir -p uploads
EXPOSE 4000
ENTRYPOINT ["java", "-jar", "app.jar"]