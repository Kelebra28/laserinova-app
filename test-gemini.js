const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const tools = [{
  functionDeclarations: [
    {
      name: "test_tool",
      description: "Test tool",
      parameters: { type: "OBJECT", properties: { param1: { type: "STRING" } } }
    }
  ]
}];

async function testModel(modelName) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName, tools: tools });
    const result = await model.generateContent("Test the tool with param1 'hello'");
    console.log(`[SUCCESS] ${modelName}`);
  } catch (e) {
    console.log(`[ERROR] ${modelName}:`, e.message);
  }
}

async function run() {
  await testModel("gemini-3.7-flash");
  await testModel("gemini-3.5-flash");
  await testModel("gemini-flash-latest");
  await testModel("gemini-2.5-flash");
  await testModel("gemini-pro-latest");
}

run();
