require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    const maxBudget = req.body.maxBudget || "any";
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
    const imagePart = {
      inlineData: { data: req.file.buffer.toString("base64"), mimeType: req.file.mimetype }
    };

    const prompt = `
      Act as a 2026 Dermatological AI. Analyze this image. 
      Recommend 2 products available in India within a total budget of ₹${maxBudget}.
      Return ONLY raw JSON:
      {
        "summary": "Professional analysis.",
        "ingredients": ["Ingredient 1", "Ingredient 2"],
        "products": [
          {"name": "Name", "category": "Premium", "reason": "Text", "link": "URL"},
          {"name": "Name", "category": "Budget", "reason": "Text", "link": "URL"}
        ]
      }
    `;

    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text();
    const cleanJson = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
    res.json({ analysis: JSON.parse(cleanJson) });
  } catch (error) {
    res.status(500).json({ error: "Analysis failed" });
  }
});

app.listen(5000, '0.0.0.0', () => console.log(`🚀 Server LIVE` ));