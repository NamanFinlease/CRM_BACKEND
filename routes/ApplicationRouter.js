import express from "express";
import upload from "../config/multer.js";
import {
    getAllApplication,
    getApplication,
    allocateApplication,
    allocatedApplications,
    recommendedApplication,
    getCamDetails,
    updateCamDetails,
    // approveApplication,
} from "../Controllers/application.js";
import { addDocs, getDocuments } from "../Controllers/docsUploadAndFetch.js";
import { onHold, unHold, getHold } from "../Controllers/holdUnhold.js";
import { rejected, getRejected } from "../Controllers/rejected.js";
import { sentBack } from "../Controllers/sentBack.js";
import { totalRecords } from "../Controllers/totalRecords.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Define the fields you want to upload
const uploadFields = upload.fields([
    { name: "aadhaarFront", maxCount: 1 },
    { name: "aadhaarBack", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
    { name: "bankStatement", maxCount: 10 }, // Allows up to 10 bank statements
    { name: "salarySlip", maxCount: 10 }, // Allows up to 10 salary slips
    { name: "others", maxCount: 10 },
]);

// Other routes
router.route("/").get(protect, getAllApplication);
router.get("/totalRecords", protect, totalRecords);
router.route("/allocated").get(protect, allocatedApplications);
router.get("/hold", protect, getHold);
router.get("/rejected", protect, getRejected);
router
    .route("/:id")
    .get(protect, getApplication)
    .patch(protect, allocateApplication);
router.route("/hold/:id").patch(protect, onHold);
router.patch("/unhold/:id", protect, unHold);
router.patch("/sent-back/:id", protect, sentBack);
router.patch("/recommend/:id", protect, recommendedApplication);
router.route("/reject/:id").patch(protect, rejected);
router
    .route("/cam/:id")
    .get(protect, getCamDetails)
    .patch(protect, updateCamDetails);

router
    .route("/docs/:id")
    .patch(protect, uploadFields, addDocs)
    .get(protect, getDocuments);
export default router;
