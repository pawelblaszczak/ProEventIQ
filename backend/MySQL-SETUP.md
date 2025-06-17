# MySQL Setup for ProEventIQ

## Development Environment Setup

1. Install MySQL Server on your local machine if not already installed.

2. Create a new MySQL database and user:

```sql
CREATE DATABASE proeventiq;
CREATE USER 'proeventiq'@'localhost' IDENTIFIED BY 'orl';
GRANT ALL PRIVILEGES ON proeventiq.* TO 'proeventiq'@'localhost';
FLUSH PRIVILEGES;
```

3. The application is configured to use the development profile by default, which connects to MySQL on localhost with user 'proeventiq' and password 'orl'.

4. Run the Spring Boot application, which will automatically create the necessary tables using JPA/Hibernate.

## Production Environment Setup

For production deployment:

1. Set the following environment variables:
   - `MYSQL_URL`: The JDBC URL for your MySQL database (e.g., jdbc:mysql://hostname:3306/proeventiq?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true)
   - `MYSQL_USERNAME`: The MySQL username
   - `MYSQL_PASSWORD`: The MySQL password

2. Set the active profile to 'prod':
   - Add the JVM argument: `-Dspring.profiles.active=prod`
   - Or set the environment variable: `SPRING_PROFILES_ACTIVE=prod`

Note: In production, make sure to use a strong password and proper security measures for your database.
