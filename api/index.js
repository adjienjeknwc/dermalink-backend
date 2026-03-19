const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

// Health check route
app.get("/", (req, res) => res.send("Dermalink API is running on Vercel"));

app.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const budget = req.body.maxBudget || 2000;

    const prompt = `
      Analyze this skin image. Provide:
      1. A brief summary of the skin condition or type.
      2. 3 recommended skincare products available in India.
      3. For each product, include: name, category (Basic or Premium), price, and reason.
      4. List key ingredients to look for.
      
      IMPORTANT: Total price of all products must be under INR ${budget}.
      Return ONLY a JSON object in this format:
      {
        "summary": "string",
        "products": [{"name": "string", "category": "string", "price": number, "reason": "string", "link": "string"}],
        "ingredients": ["string"]
      }
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType: req.file.mimetype
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Clean the JSON string from Gemini (removes markdown backticks if present)
    const cleanJson = text.replace(/```json|```/g, "");
    const analysis = JSON.parse(cleanJson);

    res.json({ analysis });
  } catch (error) {
    console.error("Analysis Error:", error);
    res.status(500).json({ error: "Failed to analyze image" });
  }
});

// IMPORTANT FOR VERCEL: Export the app instead of app.listen
module.exports = app;