# Academic Integrity Monitoring Service

Complete plagiarism detection system with real-time checking, student-to-student comparison, and internet search capabilities.

## ✨ Features

### Core Capabilities
- ✅ **Code Plagiarism Detection** - JPlag integration (20+ languages)
- ✅ **Text Plagiarism Detection** - Cosine Similarity with TF-IDF
- ✅ **Internet Plagiarism Check** - Google Custom Search API (FREE)
- ✅ **Real-time Checking** - WebSocket-based live plagiarism detection
- ✅ **Smart Question Analysis** - Automatically skips checks for factual questions
- ✅ **Automated Reporting** - Generates plagiarism reports on submission

### Intelligence Features
- 🧠 **Question Type Detection** - Distinguishes factual, subjective, code, calculation questions
- 🧠 **Contextual Checking** - Only checks when plagiarism is relevant
- 🧠 **Multi-source Comparison** - Students, previous submissions, internet
- 🧠 **Real-time Warnings** - Instant feedback as students type

### Comparison Options
1. **Check Against Specific Submissions** - Compare with selected students
2. **Check Against All Submissions** - Compare with entire class
3. **Check Against Internet** - Compare with web content (Google Search)

## 🚀 Quick Start

### Prerequisites

- Java 21
- Maven 3.8+
- PostgreSQL 15+
- Google Cloud Account (for Custom Search API - FREE)

### 1. Setup Google Custom Search API (FREE - 100 queries/day)
```bash
./scripts/setup-google-api.sh
```

Or manually:

#### Step 1: Create Google Cloud Project
1. Go to: https://console.cloud.google.com/
2. Create new project: "SmartLMS-Integrity"

#### Step 2: Enable Custom Search API
1. Go to: https://console.cloud.google.com/apis/library
2. Search: "Custom Search API"
3. Click "Enable"

#### Step 3: Create API Key
1. Go to: https://console.cloud.google.com/apis/credentials
2. Create Credentials → API Key
3. Copy the key (starts with `AIza...`)

#### Step 4: Create Custom Search Engine
1. Go to: https://programmablesearchengine.google.com/
2. Create new search engine
3. Name: "SmartLMS Plagiarism Check"
4. Search the entire web: YES
5. Copy Search Engine ID (cx parameter)

### 2. Setup Database
```bash
./scripts/setup-database.sh
```

### 3. Configure Application

Edit `src/main/resources/application.properties`:
```properties
# Google API Configuration
google.api-key=YOUR_GOOGLE_API_KEY_HERE
google.search-engine-id=YOUR_SEARCH_ENGINE_ID_HERE
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

## 📚 API Documentation

### Base URL
```
http://localhost:8084
```

### Endpoints

#### 1. Health Check
```bash
GET /api/health
```

#### 2. Run Plagiarism Check

**Check Against Specific Submissions:**
```bash
POST /api/integrity/checks
Content-Type: application/json

{
  "submissionId": 1,
  "studentId": "IT22586766",
  "assignmentId": "CS101-LAB1",
  "questionId": 1,
  "checkType": "CODE_JPLAG",
  "codeContent": "public class HelloWorld { ... }",
  "fileName": "HelloWorld.java",
  "questionText": "Write a Hello World program",
  "compareWithSubmissionIds": [2, 3, 4],
  "checkInternet": true
}
```

**Check Against All Submissions:**
```bash
POST /api/integrity/checks
Content-Type: application/json

{
  "submissionId": 1,
  "studentId": "IT22586766",
  "assignmentId": "CS101-LAB1",
  "checkType": "COMBINED",
  "textContent": "Machine learning is...",
  "questionText": "Explain machine learning",
  "checkAllInAssignment": true,
  "checkInternet": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Plagiarism check completed",
  "data": {
    "id": 1,
    "submissionId": 1,
    "studentId": "IT22586766",
    "checkType": "COMBINED",
    "questionType": "SUBJECTIVE",
    "plagiarismCheckNeeded": true,
    "overallSimilarityScore": 0.85,
    "maxSimilarityScore": 0.92,
    "studentSimilarityScore": 0.78,
    "internetSimilarityScore": 0.92,
    "flagged": true,
    "matchesFound": 2,
    "internetMatchesFound": 3,
    "similarityMatches": [
      {
        "matchedStudentId": "IT22586767",
        "similarityScore": 0.78,
        "details": "Text similarity: 78%"
      }
    ],
    "internetMatches": [
      {
        "url": "https://example.com/article",
        "title": "Machine Learning Basics",
        "snippet": "Machine learning is a subset...",
        "similarityScore": 0.92,
        "sourceDomain": "example.com"
      }
    ]
  }
}
```

#### 3. Real-time Plagiarism Check

**REST Endpoint:**
```bash
POST /api/integrity/realtime/check
Content-Type: application/json

{
  "sessionId": "session-123",
  "studentId": "IT22586766",
  "questionId": 1,
  "textContent": "As the student types this text...",
  "questionText": "Explain artificial intelligence"
}
```

**WebSocket Endpoint:**
```javascript
// Connect to WebSocket
const socket = new SockJS('http://localhost:8084/ws/integrity');
const stompClient = Stomp.over(socket);

stompClient.connect({}, function() {
    // Subscribe to plagiarism warnings
    stompClient.subscribe('/topic/plagiarism-warnings/session-123', function(message) {
        const warning = JSON.parse(message.body);
        if (warning.flagged) {
            alert(warning.warningMessage);
        }
    });
    
    // Send text for checking
    stompClient.send('/app/check-plagiarism', {}, JSON.stringify({
        sessionId: 'session-123',
        studentId: 'IT22586766',
        questionId: 1,
        textContent: 'Current answer text...',
        questionText: 'Explain AI'
    }));
});
```

#### 4. Get Plagiarism Check
```bash
GET /api/integrity/checks/{id}
```

#### 5. Get All Flagged Checks
```bash
GET /api/integrity/checks/flagged
```

#### 6. Get Checks by Assignment
```bash
GET /api/integrity/checks/assignment/{assignmentId}
```

## 🔧 Configuration

### Check Types
```java
public enum CheckType {
    CODE_JPLAG,           // Code plagiarism using JPlag
    TEXT_COSINE,          // Text similarity using Cosine
    INTERNET_SEARCH,      // Internet plagiarism using Google
    COMBINED,             // All methods combined
    REALTIME              // Real-time as user types
}
```

### Question Types (Auto-detected)
```java
public enum QuestionType {
    FACTUAL,             // "What is 2+2?" - SKIP CHECK
    OBJECTIVE,           // Multiple choice, T/F - SKIP CHECK
    SUBJECTIVE,          // Essay, explanation - CHECK
    CODE,                // Programming - CHECK
    CALCULATION,         // Math problems - SKIP CHECK
    UNKNOWN              // Check by default
}
```

### Thresholds (application.properties)
```properties
# Similarity thresholds (0.0 - 1.0)
integrity.code-similarity-threshold=0.75       # 75% for code
integrity.text-similarity-threshold=0.70       # 70% for text
integrity.internet-similarity-threshold=0.85   # 85% for internet

# Real-time check settings
integrity.realtime.enabled=true
integrity.realtime.min-text-length=50          # Minimum chars to check
integrity.realtime.check-interval-ms=2000      # Check every 2 seconds

# Question analysis
integrity.question-analysis.enabled=true
```

## 📊 Supported Programming Languages (JPlag)

- ✅ Java
- ✅ Python
- ✅ C / C++
- ✅ C#
- ✅ JavaScript / TypeScript
- ✅ Kotlin
- ✅ Scala
- ✅ Swift
- ✅ Go
- ✅ Rust
- ✅ And 10+ more!

## 🎯 How It Works

### 1. Automatic Question Analysis
```
Student submits answer to: "What is 2 + 2?"
    ↓
System analyzes question type → FACTUAL
    ↓
Plagiarism check SKIPPED (same answer expected)
    ↓
Result: "Plagiarism check not needed for this question type"
```
```
Student submits answer to: "Explain machine learning"
    ↓
System analyzes question type → SUBJECTIVE
    ↓
Plagiarism check REQUIRED (unique answer expected)
    ↓
Runs: Student comparison + Internet search
```

### 2. Multi-Source Comparison
```
Student A submits essay
    ↓
Check 1: Compare with all students in class
    │
    ├─ Student B: 15% similar ✅
    ├─ Student C: 8% similar ✅
    ├─ Student D: 92% similar ⚠️ FLAGGED!
    └─ Student E: 12% similar ✅
    ↓
Check 2: Compare with internet (Google Search)
    │
    ├─ Wikipedia: 25% similar ✅
    ├─ Medium.com: 88% similar ⚠️ FLAGGED!
    └─ StackOverflow: 10% similar ✅
    ↓
Result: FLAGGED (92% student match, 88% internet match)
```

### 3. Real-time Detection
```
Student types: "Machine learning is a subset of..."
    ↓ (after 50 chars)
Quick check: 15% similarity ✅
    ↓ (student continues typing)
Student types: "...artificial intelligence that..."
    ↓ (after 2 seconds)
Quick check: 35% similarity ✅
    ↓ (student copies from internet)
Student types: "...focuses on developing algorithms..."
    ↓ (after 2 seconds)
Quick check: 88% similarity ⚠️
    ↓
WebSocket Warning: "⚠️ Potential plagiarism detected!"
```

## 🐳 Docker Deployment
```bash
# Set environment variables
export GOOGLE_API_KEY=your_key_here
export GOOGLE_SEARCH_ENGINE_ID=your_id_here

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f integrity-monitoring-service

# Stop services
docker-compose down
```

## 📈 Performance & Limits

### Google Custom Search API (FREE Tier)
- **Daily Limit**: 100 queries/day
- **Monthly Limit**: 10,000 queries/month (with billing enabled)
- **Cost**: $0/month (free tier), $5 per 1000 queries after free tier

### JPlag Performance
- **Speed**: ~100 files in 30 seconds
- **Accuracy**: Very high (industry standard)
- **Languages**: 20+ supported

### Text Similarity Performance
- **Speed**: ~100 comparisons in 10 seconds
- **Accuracy**: Good for academic text
- **Method**: TF-IDF + Cosine Similarity

## 🔒 Privacy & Security

### Data Privacy
- ✅ Student code never sent to external services (JPlag runs locally)
- ✅ Text submissions only sent to Google when internet check enabled
- ✅ All data stored locally in PostgreSQL
- ✅ GDPR/FERPA compliant

### Security Features
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention (JPA)
- ✅ Rate limiting on real-time checks
- ✅ Secure WebSocket connections

## 🧪 Testing

### Run All Tests
```bash
./scripts/test-service.sh
```

### Manual Testing Examples

**1. Test Factual Question (Should Skip):**
```bash
curl -X POST http://localhost:8084/api/integrity/checks \
  -H "Content-Type: application/json" \
  -d '{
    "submissionId": 1,
    "studentId": "IT22586766",
    "checkType": "TEXT_COSINE",
    "textContent": "4",
    "questionText": "What is 2 + 2?",
    "checkInternet": false
  }' | jq
```

**2. Test Code Plagiarism:**
```bash
curl -X POST http://localhost:8084/api/integrity/checks \
  -H "Content-Type: application/json" \
  -d '{
    "submissionId": 2,
    "studentId": "IT22586766",
    "checkType": "CODE_JPLAG",
    "codeContent": "public class Test { ... }",
    "fileName": "Test.java",
    "questionText": "Implement a test class",
    "checkAllInAssignment": true
  }' | jq
```

**3. Test Internet Plagiarism:**
```bash
curl -X POST http://localhost:8084/api/integrity/checks \
  -H "Content-Type: application/json" \
  -d '{
    "submissionId": 3,
    "studentId": "IT22586766",
    "checkType": "INTERNET_SEARCH",
    "textContent": "The quick brown fox jumps over the lazy dog",
    "questionText": "Write about pangrams",
    "checkInternet": true
  }' | jq
```

## 🐛 Troubleshooting

### Google API Issues

**Error: 429 Too Many Requests**
```
Solution: Daily limit reached (100 queries/day)
Wait until next day or upgrade to paid plan
```

**Error: 401 Unauthorized**
```
Solution: Invalid API key
Check google.api-key in application.properties
```

**Error: 400 Bad Request**
```
Solution: Invalid Search Engine ID
Check google.search-engine-id in application.properties
```

### JPlag Issues

**Error: Unsupported language**
```
Solution: Check file extension and language mapping
Supported: .java, .py, .cpp, .c, .js, .ts, etc.
```

**Error: No submissions to compare**
```
Solution: Ensure checkAllInAssignment=true or provide compareWithSubmissionIds
```

### Database Issues

**Error: Schema not found**
```bash
# Recreate schema
psql -U postgres -d smartlms
CREATE SCHEMA IF NOT EXISTS integrity_service;
```

## 💰 Cost Analysis

### Total Annual Cost: **$0 - $60**

| Component | Free Tier | Paid Option | Annual Cost |
|-----------|-----------|-------------|-------------|
| **JPlag** | ✅ Unlimited | N/A | **$0** |
| **Text Similarity** | ✅ Unlimited | N/A | **$0** |
| **Google Search** | 100/day | $5 per 1000 | **$0 - $60** |
| **PostgreSQL** | ✅ Local | N/A | **$0** |
| **WebSocket** | ✅ Unlimited | N/A | **$0** |

**Comparison with Commercial Solutions:**
- Turnitin: $1,000 - $5,000/year
- Copyleaks: $600 - $2,400/year
- PlagScan: $500 - $3,000/year

**Savings: $500 - $5,000/year!** 🎉

## 🔄 Integration with Other Services

### With Submission Management Service
```java
// When student submits assignment
POST /api/submissions
    ↓
Submission saved
    ↓
Trigger plagiarism check
POST /api/integrity/checks
    ↓
Check completed
    ↓
Update submission with check ID
```

### With Frontend (Real-time)
```javascript
// React component example
const AnswerEditor = () => {
    const [text, setText] = useState('');
    const [warning, setWarning] = useState(null);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            if (text.length > 50) {
                checkPlagiarism(text);
            }
        }, 2000);
        
        return () => clearTimeout(timer);
    }, [text]);
    
    const checkPlagiarism = async (content) => {
        const response = await fetch('/api/integrity/realtime/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: sessionStorage.getItem('sessionId'),
                studentId: currentStudent.id,
                questionId: currentQuestion.id,
                textContent: content,
                questionText: currentQuestion.text
            })
        });
        
        const result = await response.json();
        if (result.data.flagged) {
            setWarning(result.data.warningMessage);
        }
    };
    
    return (
        <div>
            <textarea 
                value={text} 
                onChange={(e) => setText(e.target.value)}
            />
            {warning && <Alert severity="warning">{warning}</Alert>}
        </div>
    );
};
```

## 📝 Database Schema
```sql
-- Plagiarism Checks
CREATE TABLE plagiarism_checks (
    id BIGSERIAL PRIMARY KEY,
    submission_id BIGINT NOT NULL,
    student_id VARCHAR(100) NOT NULL,
    assignment_id VARCHAR(100),
    question_id BIGINT,
    check_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    question_type VARCHAR(50),
    plagiarism_check_needed BOOLEAN DEFAULT TRUE,
    skip_reason TEXT,
    overall_similarity_score DECIMAL(5,4),
    max_similarity_score DECIMAL(5,4),
    student_similarity_score DECIMAL(5,4),
    internet_similarity_score DECIMAL(5,4),
    flagged BOOLEAN DEFAULT FALSE,
    matches_found INTEGER DEFAULT 0,
    internet_matches_found INTEGER DEFAULT 0,
    processing_time_ms BIGINT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Similarity Matches (Student-to-Student)
CREATE TABLE similarity_matches (
    id BIGSERIAL PRIMARY KEY,
    plagiarism_check_id BIGINT NOT NULL,
    matched_submission_id BIGINT,
    matched_student_id VARCHAR(100),
    similarity_score DECIMAL(5,4) NOT NULL,
    file_name VARCHAR(255),
    matched_file_name VARCHAR(255),
    matching_lines INTEGER,
    tokens_matched INTEGER,
    details TEXT,
    FOREIGN KEY (plagiarism_check_id) REFERENCES plagiarism_checks(id)
);

-- Internet Matches
CREATE TABLE internet_matches (
    id BIGSERIAL PRIMARY KEY,
    plagiarism_check_id BIGINT NOT NULL,
    url TEXT,
    title TEXT,
    snippet TEXT,
    similarity_score DECIMAL(5,4),
    matched_text TEXT,
    source_domain VARCHAR(255),
    FOREIGN KEY (plagiarism_check_id) REFERENCES plagiarism_checks(id)
);

-- Real-time Checks
CREATE TABLE realtime_checks (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    student_id VARCHAR(100) NOT NULL,
    question_id BIGINT NOT NULL,
    text_length INTEGER,
    similarity_score DECIMAL(5,4),
    flagged BOOLEAN DEFAULT FALSE,
    warning_shown BOOLEAN DEFAULT FALSE,
    checked_at TIMESTAMP DEFAULT NOW()
);
```

## 🎓 Educational Use Cases

### 1. Programming Assignments
- Detect code copying between students
- Compare with GitHub/StackOverflow
- Support 20+ languages

### 2. Essays & Reports
- Detect text plagiarism
- Check against internet sources
- Real-time warnings while writing

### 3. Exam Questions
- Skip factual questions automatically
- Focus on subjective answers
- Instant plagiarism detection

## 📄 License

MIT License

## 🙏 Acknowledgments

- [JPlag](https://github.com/jplag/JPlag) - Code plagiarism detection
- [Google Custom Search](https://developers.google.com/custom-search) - Internet search
- [Apache Commons Math](https://commons.apache.org/proper/commons-math/) - Similarity algorithms
- Spring Boot Team

---

**Made with ❤️ for Smart LMS - 100% Open Source**