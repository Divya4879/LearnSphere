// API client for LearnSphere backend
class LearnSphereAPI {
  constructor() {
    this.baseURL = '';
  }

  async generateContent(model, prompt, config = {}) {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          config
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async generateImages(model, prompt, config = {}) {
    // For now, return a placeholder since image generation needs special handling
    throw new Error('Image generation not yet implemented in backend');
  }
}

window.LearnSphereAPI = new LearnSphereAPI();
