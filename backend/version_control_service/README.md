# Version Control Service

Git-style version control system for academic submissions in the Smart LMS platform.

## Features

- ✅ Content-addressable storage with SHA-256 hashing
- ✅ Automatic deduplication of identical files
- ✅ Version history tracking
- ✅ Text and code diff generation
- ✅ Snapshot and delta compression support
- ✅ WebSocket support for real-time updates
- ✅ Multi-file version management

## Tech Stack

- **Framework**: Spring Boot 3.1.5
- **Database**: PostgreSQL 15+
- **Diff Library**: java-diff-utils 4.12
- **Document Processing**: Apache Tika 2.9.1
- **Language**: Java 17

## Getting Started

### Prerequisites

- Java 17+
- PostgreSQL 15+
- Maven 3.8+

### Running Locally
```bash
mvn spring-boot:run
```

Service runs on `http://localhost:8082`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/versions/create` | Create new version |
| GET | `/api/versions/{id}` | Get version by ID |
| GET | `/api/versions/submission/{id}` | Get all versions for submission |
| GET | `/api/versions/submission/{id}/latest` | Get latest version |
| POST | `/api/versions/diff` | Generate diff between versions |
| GET | `/api/versions/{id}/file` | Get file content from version |

## Database Schema

See documentation for detailed schema.

## Integration

This service integrates with:
- **submission-management-service**: Receives file upload events
- **ai-feedback-service**: Triggers version creation after feedback

## License

MIT License