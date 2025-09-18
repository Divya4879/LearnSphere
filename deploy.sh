#!/bin/bash

# LearnSphere Cloud Run Deployment Script
# Usage: ./deploy.sh PROJECT_ID GEMINI_API_KEY [REGION]

if [ $# -lt 2 ]; then
    echo "Usage: $0 PROJECT_ID GEMINI_API_KEY [REGION]"
    echo "Example: $0 my-project-123 AIzaSyC... us-central1"
    exit 1
fi

PROJECT_ID=$1
GEMINI_API_KEY=$2
REGION=${3:-us-central1}
SERVICE_NAME="learnsphere"

echo "🚀 Deploying LearnSphere to Google Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Service: $SERVICE_NAME"

# Set the project
gcloud config set project $PROJECT_ID

# Build and deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
    --source . \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --memory 1Gi \
    --cpu 1 \
    --max-instances 10 \
    --set-env-vars "NODE_ENV=production,GEMINI_API_KEY=$GEMINI_API_KEY" \
    --port 8080

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "🌐 Your LearnSphere app is now live at:"
    gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'
else
    echo "❌ Deployment failed!"
    exit 1
fi
