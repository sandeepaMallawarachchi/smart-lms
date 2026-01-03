# AI Feedback Service

Open-source AI-powered feedback generation for student submissions using Ollama.

## Features

- ✅ **Open-Source LLM Integration** using Ollama (Llama 3.2, Phi-3, Mistral)
- ✅ Rubric-based evaluation
- ✅ Criterion-by-criterion feedback
- ✅ Redis caching for improved performance
- ✅ Async feedback generation
- ✅ Fallback to rule-based feedback
- ✅ Cost-effective (100% free - no API costs!)

## Tech Stack

- **Framework**: Spring Boot 3.1.5
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7
- **LLM**: Ollama (open-source)
- **Language**: Java 17

## Prerequisites

- Java 17+
- PostgreSQL 15+
- Redis 7+
- Ollama (for AI features)

## Installation

### 1. Install Ollama

**Linux/Mac:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from https://ollama.com/download

### 2. Pull Models
```bash
# Recommended model (2GB)
ollama pull llama3.2

# Alternative models
ollama pull phi3        # 2.3GB
ollama pull mistral     # 4.1GB
```

### 3. Start Ollama
```bash
ollama serve
```

Ollama runs on `http://localhost:11434`

### 4. Configure Application

Update `application.properties`:
```properties
ollama.base-url=http://localhost:11434
ollama.model=llama3.2
```

### 5. Run the Service
```bash
mvn spring-boot:run
```

Service runs on `http://localhost:8083`

## API Endpoints

### Feedback

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/feedback/generate` | Generate feedback (sync) |
| POST | `/api/feedback/generate-async` | Generate feedback (async) |
| GET | `/api/feedback/{id}` | Get feedback by ID |
| GET | `/api/feedback/submission/{id}` | Get feedback for submission |
| GET | `/api/feedback/student/{id}` | Get feedback for student |

### Rubrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rubrics` | Create rubric |
| GET | `/api/rubrics` | Get all rubrics |
| GET | `/api/rubrics/{id}` | Get rubric by ID |
| PUT | `/api/rubrics/{id}` | Update rubric |
| DELETE | `/api/rubrics/{id}` | Delete rubric |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Service health + Ollama status |

## Usage Examples

### 1. Create a Rubric
```bash
curl -X POST http://localhost:8083/api/rubrics \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Programming Assignment Rubric",
    "description": "Evaluation criteria for coding assignments",
    "assignmentType": "CODE",
    "createdBy": "instructor001",
    "criteria": [
      {
        "name": "Code Quality",
        "description": "Clean, readable, well-documented code",
        "maxScore": 40.0,
        "evaluationGuidelines": "Check naming conventions, comments, structure"
      },
      {
        "name": "Functionality",
        "description": "Code works as expected",
        "maxScore": 40.0,
        "evaluationGuidelines": "Test all features, edge cases"
      },
      {
        "name": "Efficiency",
        "description": "Optimal algorithms and data structures",
        "maxScore": 20.0,
        "evaluationGuidelines": "Analyze time/space complexity"
      }
    ]
  }'
```

### 2. Generate Feedback
```bash
curl -X POST http://localhost:8083/api/feedback/generate \
  -H "Content-Type: application/json" \
  -d '{
    "submissionId": 1,
    "studentId": "ST12345",
    "rubricId": 1,
    "submissionContent": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
    "forceRegenerate": false
  }'
```

## Model Comparison

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| **llama3.2** | 2GB | Fast | Good | General feedback (Recommended) |
| **phi3** | 2.3GB | Fast | Good | Short responses |
| **mistral** | 4.1GB | Medium | Better | Detailed analysis |
| **llama3** | 4.7GB | Medium | Better | Complex evaluations |

## Performance Optimization

### 1. Enable Redis Caching
```properties
spring.cache.type=redis
ai.feedback.cache-enabled=true
```

### 2. Use Async Generation
```javascript
// In your frontend
const response = await fetch('/api/feedback/generate-async', {
  method: 'POST',
  body: JSON.stringify(feedbackRequest)
});

// Poll for results
const feedback = await fetch(`/api/feedback/submission/${submissionId}`);
```

### 3. Optimize Model Settings
```properties
ollama.temperature=0.7      # Lower = more consistent
ollama.max-tokens=1000      # Adjust based on needs
```

## Budget Analysis

### Cost Comparison

| Solution | Setup Cost | Monthly Cost | Annual Cost |
|----------|-----------|--------------|-------------|
| **Ollama (This)** | $0 | $0 | **$0** |
| OpenAI GPT-4o-mini | $0 | ~$5-20 | $60-240 |
| Claude Haiku | $0 | ~$10-30 | $120-360 |

**Hardware Requirements:**
- Minimum: 8GB RAM, 4 CPU cores
- Recommended: 16GB RAM, 8 CPU cores
- Storage: 5-10GB for models

## Troubleshooting

### Ollama Not Available
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not running, start it
ollama serve

# Check models
ollama list
```

### Slow Generation

1. Use a smaller model (phi3 instead of mistral)
2. Reduce max_tokens in config
3. Enable Redis caching
4. Use async generation

### Out of Memory
```bash
# Use a smaller model
ollama pull phi3

# Update config
ollama.model=phi3
```

## Testing

Run tests:
```bash
mvn test
```

Test with script:
```bash
./infrastructure/scripts/test-ai-service.sh
```

## Docker Deployment
```bash
# Build and run
docker-compose up -d ai-feedback-service

# View logs
docker-compose logs -f ai-feedback-service
```

## Alternative: Using LocalAI

If you prefer LocalAI over Ollama:
```properties
ai.feedback.provider=localai
localai.base-url=http://localhost:8080
localai.model=ggml-gpt4all-j
localai.enabled=true
```

## Contributing

1. Follow existing code style
2. Add tests for new features
3. Update documentation

## License

MIT License