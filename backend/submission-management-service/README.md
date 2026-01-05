# Submission Management Service

Core microservice for handling student submissions in the Smart LMS platform.

## Features

- ✅ Create, read, update, delete submissions
- ✅ File upload and management
- ✅ Support for multiple file formats
- ✅ Submission status tracking
- ✅ Grading functionality
- ✅ Version tracking integration
- ✅ RESTful API with proper error handling

## Tech Stack

- **Framework**: Spring Boot 3.1.5
- **Database**: PostgreSQL 15+
- **Language**: Java 21
- **Build Tool**: Maven

## Getting Started

### Prerequisites

- Java 17 or higher
- PostgreSQL 15+
- Maven 3.8+

### Running Locally

1. **Set up database**:
```bash
createdb smartlms
psql -d smartlms -c "CREATE SCHEMA submission_service;"
```

2. **Configure application.properties**:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/smartlms
spring.datasource.username=your_username
spring.datasource.password=your_password
```

3. **Run the application**:
```bash
mvn spring-boot:run
```

The service will start on `http://localhost:8081`

### Running with Docker
```bash
docker build -t submission-service .
docker run -p 8081:8081 submission-service
```

## API Endpoints

### Submissions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/submissions` | Create new submission |
| GET | `/api/submissions` | Get all submissions |
| GET | `/api/submissions/{id}` | Get submission by ID |
| PUT | `/api/submissions/{id}` | Update submission |
| DELETE | `/api/submissions/{id}` | Delete submission |
| POST | `/api/submissions/{id}/submit` | Submit for grading |
| POST | `/api/submissions/{id}/grade` | Grade submission |

### Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/submissions/{id}/files` | Upload file |
| GET | `/api/submissions/{id}/files` | List files |
| GET | `/api/submissions/{id}/files/{fileId}` | Download file |
| DELETE | `/api/submissions/{id}/files/{fileId}` | Delete file |

## Testing

Run tests:
```bash
mvn test
```

Run with coverage:
```bash
mvn clean test jacoco:report
```

## Project Structure
```
src/
├── main/
│   ├── java/com/smartlms/submission/
│   │   ├── controller/      # REST controllers
│   │   ├── service/         # Business logic
│   │   ├── repository/      # Data access
│   │   ├── model/           # JPA entities
│   │   ├── dto/             # Data transfer objects
│   │   ├── config/          # Configuration classes
│   │   └── exception/       # Custom exceptions
│   └── resources/
│       └── application.properties
└── test/
    └── java/com/smartlms/submission/
```

## Database Schema

See `docs/database-schema.md` for detailed schema documentation.

## Contributing

See `CONTRIBUTING.md` for development guidelines.

## License

MIT License - see LICENSE file for details.