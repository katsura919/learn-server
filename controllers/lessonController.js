const Lesson = require("../models/lessonModel");
const Category = require("../models/categoryModel");
const { getIO } = require("../lib/socket");
const cloudinary = require("../lib/cloudinary");

// Create new lesson
const createLesson = async (req, res) => {
  try {
    const { title, content, categoryName } = req.body;
    const userId = req.user?.id;

    const categoryToFind = categoryName?.trim() || "default";

    let category = await Category.findOne({ name: categoryToFind, userId });

    let isNewCategory = false;

    if (!category) {
      category = await Category.create({ name: categoryToFind, userId });
      isNewCategory = true;
    }

    const newLesson = await Lesson.create({
      userId,
      title,
      content,
      categoryId: category._id,
    });

    // Emit "new_category" only if it's a newly created one
    if (isNewCategory) {
      const io = getIO();
      io.emit("new_category", {
        id: category._id.toString(),
        name: category.name,
      });
    }

    res.status(201).json(newLesson);
  } catch (error) {
    console.error("Error creating lesson:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const createPdfLesson = async (req, res) => {
  try {
    const { title, categoryName } = req.body;
    const userId = req.user?.id;

    if (!title || !req.file) {
      return res.status(400).json({ error: "Title and PDF file are required." });
    }

    const categoryToFind = categoryName?.trim() || "default";
    let category = await Category.findOne({ name: categoryToFind, userId });

    if (!category) {
      category = await Category.create({ name: categoryToFind, userId });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "raw", 
      folder: "lessons/pdfs",
    });

    const newLesson = await Lesson.create({
      userId,
      title,
      pdfUrl: result.secure_url,
      isPdf: true,
      categoryId: category._id,
    });

    res.status(201).json(newLesson);
  } catch (error) {
    console.error("Error creating PDF lesson:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};



// Get all lessons for the logged-in user
const getLessons = async (req, res) => {
  try {
    const userId = req.user.id;
    const lessons = await Lesson.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(lessons);
  } catch (error) {
    console.error("Error fetching lessons:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Fetch lessons by categoryId
const getLessonsByCategoryId = async (req, res) => {
  const { categoryId } = req.params;

  try {
    const lessons = await Lesson.find({ categoryId });
    res.status(200).json({ success: true, data: lessons });
  } catch (error) {
    console.error('Error fetching lessons by categoryId:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};


// Get single lesson by ID
const getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });

    res.status(200).json(lesson);
  } catch (error) {
    console.error("Error fetching lesson:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
 
const updateLesson = async (req, res) => {
  try {
    const { title, content } = req.body;

    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });


    if (title) lesson.title = title;
    if (content) lesson.content = content;

    await lesson.save();
    res.status(200).json({ message: "Lesson updated successfully", lesson });
  } catch (error) {
    console.error("Error updating lesson:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete lesson
const deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });

    await lesson.deleteOne();
    res.status(200).json({ message: "Lesson deleted successfully" });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getLatestLessons = async (req, res) => {
  try {
    const userId = req.params.userId;

    const latestLessons = await Lesson.find({ userId })
      .sort({ createdAt: -1 }) // latest first
      .limit(5)
      .populate("categoryId", "name"); // optional: populate category name

    res.status(200).json({ lessons: latestLessons });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch latest lessons", error });
  }
};

const countUserLessons = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Get the count of lessons for the user
    const lessonCount = await Lesson.countDocuments({ userId });

    // If no lessons found, return 0
    res.status(200).json({ total: lessonCount || 0 });
  } catch (error) {
    res.status(500).json({ message: "Failed to count user's lessons", error });
  }
};


module.exports = { 
  createLesson, 
  createPdfLesson,
  getLessons, 
  getLessonsByCategoryId,
  getLessonById, 
  updateLesson, 
  deleteLesson, 
  getLatestLessons,
  countUserLessons
};
