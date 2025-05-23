require("dotenv").config();
const Question = require("../models/questionModel");
const Lesson = require("../models/lessonModel");
const {model, generationConfig} = require("../lib/geminiAI");


// Generate Question(s)
const generateQuestions = async (req, res) => {
  try {
    const { lessonId } = req.params;
   
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });


    const prompt = `
    I have the following lesson notes:
    "${lesson.content}"
  
    Generate exactly 5 multiple-choice questions based on this lesson.
    Each question must have exactly 4 answer choices.
    Indicate the correct answer.

    **VERY IMPORTANT:** Return ONLY valid text in a JSON format without any explanations, extra text, or formatting like markdown, backticks, or code blocks.

    Format it EXACTLY like this:
    
    {
      "questions": [
        {
          "questionText": "Your question here",
          "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
          "correctAnswer": "Choice A"
        }
      ]
    }

    `;

    const cleanResponse = (responseText) => {
      const cleanedText = responseText.replace(/^[a-zA-Z]+\n*|```json|\n```/g, '').trim();
      return cleanedText;
    };
    
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });
    
    const responseText = await result.response.text();
    const cleanedResponse = cleanResponse(responseText);
    console.log("Cleaned Response:", cleanedResponse);
    
    // Now parse the cleaned response as JSON
    const parsedData = JSON.parse(cleanedResponse);
    const generatedQuestions = parsedData.questions;
    

    const savedQuestions = await Question.insertMany(
      generatedQuestions.map(q => ({
        lessonId,
        questionText: q.questionText,
        choices: q.choices,
        correctAnswer: q.correctAnswer,
      }))
    );

    res.status(201).json(savedQuestions);
  } catch (error) {
    console.error("Error generating questions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};




// Get Questions by Lesson ID
const getQuestionsByLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;


    if (!lessonId) {
      return res.status(400).json({ error: "Lesson ID is required" });
    }

 
    const questions = await Question.find({ lessonId });


    res.status(200).json({ questions });
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: "Failed to fetch questions" });
  }
};



// Batch update multiple questions
const batchUpdateQuestions = async (req, res) => {
  try {
    const { updates } = req.body; // Expecting an array of { _id, questionText, choices, correctAnswer }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: "No updates provided" });
    }

    const operations = updates.map((q) => ({
      updateOne: {
        filter: { _id: q._id },
        update: {
          questionText: q.questionText,
          choices: q.choices,
          correctAnswer: q.correctAnswer,
        },
      },
    }));

    const result = await Question.bulkWrite(operations);
    res.status(200).json({ message: "Questions updated", result });
  } catch (error) {
    res.status(500).json({ message: "Batch update failed", error });
  }
};


module.exports = { 
  generateQuestions, 
  getQuestionsByLesson, 
  batchUpdateQuestions
};
