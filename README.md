# 🎓 LearnSphere AI

<div align="center">
  
  <p align="center">
    <strong>Your Personal AI Tutor that transforms any subject into tailored learning content</strong>
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

Check it out here:- [LearnSphere](https://learnsphere-113127247414.us-central1.run.app)

### Project Snapshots

<div align="center">
<img width="951" height="572" alt="Screenshot 2025-09-18 211651" src="https://github.com/user-attachments/assets/918901d2-5ec0-49f7-bbb3-7575f0333933" />
<img width="947" height="647" alt="Screenshot 2025-09-18 223136" src="https://github.com/user-attachments/assets/43f01738-0b74-4585-a413-f826c8085fa6" />
<img width="913" height="730" alt="Screenshot 2025-09-18 223144" src="https://github.com/user-attachments/assets/871b99e7-0fc0-4ec1-af3c-16694907a109" />
<img width="951" height="700" alt="Screenshot 2025-09-18 223151" src="https://github.com/user-attachments/assets/996f6c5d-86d1-426f-ab62-a997c0463abe" />
<img width="468" height="759" alt="Screenshot 2025-09-18 223202" src="https://github.com/user-attachments/assets/a3269cd9-ecdb-49bf-852d-ee38ff7600a8" />
<img width="459" height="752" alt="Screenshot 2025-09-18 223213" src="https://github.com/user-attachments/assets/9264ef34-5ba9-4f49-b6c9-10530045d5bf" />
<img width="413" height="620" alt="Screenshot 2025-09-18 223226" src="https://github.com/user-attachments/assets/80d253e8-e1a9-43a1-9975-d390f2f740c5" />
<img width="347" height="530" alt="Screenshot 2025-09-18 223239" src="https://github.com/user-attachments/assets/ddcb0049-a528-4f9e-b975-bf398e59c35e" />
<img width="705" height="718" alt="Screenshot 2025-09-18 223254" src="https://github.com/user-attachments/assets/4d6051d7-b178-497c-a816-c69d8ab122e3" />
<img width="943" height="719" alt="Screenshot 2025-09-18 223312" src="https://github.com/user-attachments/assets/2d8fd8ea-e008-4c08-914d-90b0ba3703f7" />
<img width="959" height="581" alt="Screenshot 2025-09-18 223321" src="https://github.com/user-attachments/assets/e72adc24-f3ab-48ae-9a9e-eb8f37f0abf9" />
<img width="896" height="703" alt="Screenshot 2025-09-18 223330" src="https://github.com/user-attachments/assets/6f7e146b-da01-4748-a713-6dbda22270bf" />
</div>

---


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

---

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

---


<div align="center">
  <p>Built with ❤️ for students who deserve better learning tools</p>
  <p>
    <a href="#-learnsphere-ai">Back to Top</a>
  </p>
</div>
