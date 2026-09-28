const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function main() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });
  
  const contents = [
    { role: 'model', parts: [{ text: "Hello" }] },
    { role: 'user', parts: [{ text: "Hi" }] }
  ];
  
  try {
    const result = await model.generateContent({ contents });
    console.log(result.response.text());
  } catch (e) {
    console.error("ERROR:", e);
  }
}
main();
