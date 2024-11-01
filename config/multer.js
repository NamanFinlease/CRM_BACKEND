// config/multer.js
import multer from "multer";

// Configure Multer to use memory storage (keep files in memory as buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

export default upload;
