# AI Feedback Service - Hugging Face Edition

Free, open-source AI-powered feedback generation using Hugging Face Inference API.

## ✨ Features

- ✅ **100% Free** - No API costs, uses Hugging Face free tier
- ✅ **No Credit Card** - Sign up with just email
- ✅ **Rubric-Based Evaluation** - Structured feedback with criteria
- ✅ **Redis Caching** - 30-70% faster with cache hits
- ✅ **Async Processing** - Non-blocking feedback generation
- ✅ **Multiple AI Models** - Mistral, Llama 2, Phi-2

## 🚀 Quick Start

### Prerequisites

- Java 21
- Maven 3.8+
- PostgreSQL 15+
- Redis 7+ (optional but recommended)

### 1. Get Hugging Face API Token (Free)
```bash
# Run helper script
./scripts/get-hf-token.sh

# Or manually:
# 1. Sign up: https://huggingface.co/join
# 2. Get token: https://huggingface.co/settings/tokens
# 3. Update application.properties with your token
```

### 2. Setup Database
```bash
./scripts/setup-database.sh
```

### 3. Configure Application

Edit `src/main/resources/application.properties`:
```properties
# Add your Hugging Face token
huggingface.api-key=hf_your_token_here
```

### 4. Build and Run
```bash
# Build
mvn clean install

# Run
mvn spring-boot:run
```

### 5. Test the Service
```bash
./scripts/test-service.sh
```

## 📚 API Endpoints

### Health Check
```bash
GET /api/health
```

### Generate Feedback
```bash
POST /api/feedback/generate
Content-Type: application/json

{
  "submissionId": 1,
  "studentId": "IT22586766",
  "rubricId": 1,
  "submissionContent": "public class HelloWorld { ... }",
  "forceRegenerate": false
}
```

### Get Feedback
```bash
GET /api/feedback/{id}
GET /api/feedback/submission/{submissionId}
GET /api/feedback/student/{studentId}
```

### Rubric Management
```bash
POST /api/rubrics          # Create rubric
GET /api/rubrics           # List rubrics
GET /api/rubrics/{id}      # Get rubric
PUT /api/rubrics/{id}      # Update rubric
DELETE /api/rubrics/{id}   # Delete rubric
```

## 🐳 Docker Deployment
```bash
# Set your Hugging Face token
export HUGGINGFACE_API_KEY=hf_your_token_here

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f ai-feedback-service
```

## 🔧 Configuration

### Available AI Models

Edit in `application.properties`:
```properties
# Recommended (7B, balanced)
huggingface.model=mistralai/Mistral-7B-Instruct-v0.2

# Smaller, faster (3B)
huggingface.model=microsoft/phi-2

# Larger, better quality (13B)
huggingface.model=meta-llama/Llama-2-13b-chat-hf
```

### Performance Settings
```properties
# Caching
ai.feedback.cache-enabled=true
ai.feedback.cache-ttl-days=7

# Async processing
ai.feedback.async-enabled=true
ai.feedback.max-concurrent-requests=5

# Hugging Face
huggingface.timeout=120
huggingface.max-tokens=2000
```

## 📊 Performance

| Scenario | Time | Cache |
|----------|------|-------|
| First feedback | 30-90s | ❌ |
| Cached feedback | <1s | ✅ |
| Rubric-based (3 criteria) | 60-120s | ❌ |
| General feedback | 20-60s | ❌ |

## 🐛 Troubleshooting

### Model Loading Error (503)
```
Issue: "Model is loading"
Solution: Wait 20 seconds, API auto-retries
```

### Invalid API Key
```
Issue: 401 Unauthorized
Solution: Check token in application.properties
```

### Slow Generation
```
Issue: Taking too long
Solution: Use smaller model (phi-2)
```

## 💰 Cost Comparison

| Solution | Annual Cost |
|----------|-------------|
| **Hugging Face (This)** | **$0** |
| OpenAI GPT-4 | $5,000-20,000 |
| Google Gemini | $3,000-15,000 |
| Claude API | $4,000-18,000 |

**Total Savings: $3,000-20,000/year!** 🎉

## 📄 License

MIT License

## 🙏 Acknowledgments

- [Hugging Face](https://huggingface.co/) - Free AI inference
- [Mistral AI](https://mistral.ai/) - Open-source models
- Spring Boot Team

---

**Made with ❤️ for Smart LMS**