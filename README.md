# 🎓 LearnSphere AI

<div align="center">
  <img width="1200" height="475" alt="LearnSphere AI Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
  
  <p align="center">
    <strong>Your Personal AI Tutor that transforms any subject into tailored learning content</strong>
  </p>
  
  <p align="center">
    <a href="#-features">Features</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-deployment">Deployment</a> •
    <a href="#-api-reference">API</a> •
    <a href="#-contributing">Contributing</a>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/React-18+-61DAFB?style=flat&logo=react&logoColor=white" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5+-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Google_Cloud-4285F4?style=flat&logo=google-cloud&logoColor=white" alt="Google Cloud" />
    <img src="https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white" alt="Docker" />
  </p>
</div>

---

## 🚀 Overview

LearnSphere AI is a comprehensive learning platform that leverages Google's Gemini AI to create personalized educational experiences. Built for students who need adaptive, context-aware learning support, it transforms any subject into multiple learning formats while maintaining persistent context across sessions.

### 🎯 Problem Solved

Traditional AI learning tools lose context between sessions, forcing students to repeatedly explain their academic level, subjects, and learning preferences. LearnSphere AI maintains your learning journey, adapting content to your specific needs and academic level.

## ✨ Features

### 🧠 **Intelligent Learning Flow**
- **Profile-Based Learning**: Set your academic level and specialization once
- **Syllabus Extraction**: Upload syllabus images and extract topics using AI vision
- **Topic Selection**: Choose specific units or topics for focused learning

### 📚 **Multiple Content Formats**
- **In-depth Explanations**: Comprehensive topic coverage
- **Study Notes**: Concise, structured summaries  
- **Interactive Flashcards**: JSON-structured cards for spaced repetition
- **Smart Quizzes**: MCQ (single/multiple choice) and subjective questions
- **Real-world Examples**: Practical applications and case studies
- **Key Takeaways**: Essential points for quick review

### 🎓 **Advanced Learning Tools**
- **Feynman Technique**: Teach-back method with AI feedback
- **SWOT Analysis**: Personalized strengths/weaknesses assessment from quiz performance
- **Study Planner**: Realistic schedules based on available time and topics
- **Content Refinement**: Iterative improvement based on user feedback

### 🔄 **Smart Features**
- **Context Persistence**: Maintains learning state across sessions
- **PDF Export**: Download study materials for offline use
- **Progress Tracking**: Monitor learning journey and improvements
- **Personalized Suggestions**: AI-powered study recommendations

## 🛠 Tech Stack

### Frontend
- **React 18+** with **TypeScript** for type-safe development
- **Modern ES6+** with async/await patterns
- **Responsive Design** with custom CSS styling
- **HTML5 Canvas** integration for PDF generation

### Backend
- **Node.js 20+** with **Express.js** framework
- **Production Security**: Helmet, CORS, compression middleware
- **Health Checks**: `/health` endpoint for monitoring
- **Graceful Shutdowns**: Proper process termination handling

### AI Integration
- **Google Gemini 2.5 Flash** for content generation
- **Structured AI Responses** using JSON schemas
- **Vision API** for syllabus image processing
- **Secure API Architecture** with server-side key management

### DevOps & Deployment
- **Docker** containerization with multi-stage builds
- **Google Cloud Run** for serverless deployment
- **Environment-based Configuration** for dev/prod environments
- **Automated Health Monitoring** and logging

## 🚀 Quick Start

### Prerequisites
- **Node.js 20+**
- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))
- **Git**

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Divya4879/StudyQuest--LearnSphere.git
   cd StudyQuest--LearnSphere
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env.local file
   echo "GEMINI_API_KEY=your_api_key_here" > .env.local
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   ```
   http://localhost:8080
   ```

### Docker Development

```bash
# Build the image
docker build -t learnsphere-ai .

# Run the container
docker run -p 8080:8080 -e GEMINI_API_KEY=your_api_key_here learnsphere-ai
```

## 🌐 Deployment

### Google Cloud Run (Recommended)

1. **Prerequisites**
   - Google Cloud CLI installed and authenticated
   - Project with Cloud Run API enabled

2. **Quick Deploy**
   ```bash
   # Make deploy script executable
   chmod +x deploy.sh
   
   # Deploy to Cloud Run
   ./deploy.sh YOUR_PROJECT_ID YOUR_GEMINI_API_KEY us-central1
   ```

3. **Manual Deploy**
   ```bash
   gcloud run deploy learnsphere \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --memory 1Gi \
     --cpu 1 \
     --set-env-vars "NODE_ENV=production,GEMINI_API_KEY=your_key"
   ```

### Other Platforms

<details>
<summary>Deploy to Heroku</summary>

```bash
# Install Heroku CLI and login
heroku create your-app-name
heroku config:set GEMINI_API_KEY=your_api_key_here
git push heroku main
```
</details>

<details>
<summary>Deploy to Railway</summary>

```bash
# Install Railway CLI
railway login
railway init
railway add GEMINI_API_KEY=your_api_key_here
railway up
```
</details>

## 📡 API Reference

### Health Check
```http
GET /health
```
Returns application health status and API key configuration.

### AI Content Generation
```http
POST /api/gemini
Content-Type: application/json

{
  "model": "gemini-2.5-flash",
  "prompt": "Your prompt here",
  "config": {
    "responseMimeType": "application/json",
    "responseSchema": {...}
  }
}
```

## 🏗 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │───▶│  Express Server │───▶│   Gemini API    │
│   (Frontend)    │    │   (Backend)     │    │   (AI Service)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Static Files  │    │  API Endpoints  │    │ Content Generation│
│   CSS, Images   │    │  Health Checks  │    │ Vision Processing │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | ✅ | - |
| `NODE_ENV` | Environment mode | ❌ | `development` |
| `PORT` | Server port | ❌ | `8080` |

### Feature Flags

Modify these in `index.tsx` to enable/disable features:

```typescript
const FEATURES = {
  MINDMAP_GENERATION: false, // Disabled in current version
  PDF_EXPORT: true,
  QUIZ_GENERATION: true,
  FEYNMAN_TECHNIQUE: true
};
```

## 🧪 Testing

```bash
# Run health check
curl http://localhost:8080/health

# Test AI endpoint (requires running server)
curl -X POST http://localhost:8080/api/gemini \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini-2.5-flash","prompt":"Hello"}'
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- Use TypeScript for type safety
- Follow React best practices
- Implement proper error handling
- Add comments for complex logic
- Ensure responsive design

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for powerful language model capabilities
- **React Community** for excellent documentation and tools
- **VirtuHack** for inspiring this educational innovation

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Divya4879/StudyQuest--LearnSphere/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Divya4879/StudyQuest--LearnSphere/discussions)
- **Email**: [Create an issue](https://github.com/Divya4879/StudyQuest--LearnSphere/issues/new) for support

---

<div align="center">
  <p>Built with ❤️ for students who deserve better learning tools</p>
  <p>
    <a href="#-learnsphere-ai">Back to Top</a>
  </p>
</div>

