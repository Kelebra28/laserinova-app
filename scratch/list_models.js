const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

(async () => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    const embeddingModels = data.models.filter(m => m.supportedGenerationMethods.includes('embedContent'));
    console.log("Modelos de embedding disponibles:");
    embeddingModels.forEach(m => console.log(m.name));
  } catch(e) {
    console.error(e);
  }
})();
