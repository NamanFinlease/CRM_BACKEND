import express from "express";
const router = express.Router();
import { rejected } from "../Controllers/rejected.js";
import {
    getRecommendedApplications,
    getSanction,
    sanctionApprove,
    sanctionPreview,
    sanctioned,
} from "../Controllers/sanction.js";
import { sentBack } from "../Controllers/sentBack.js";
import { protect } from "../middleware/authMiddleware.js";

router.route("/approved").get(protect, sanctioned);
router.get("/recommended", protect, getRecommendedApplications);
router.get("/:id", protect, getSanction);
router.get("/preview/:id", protect, sanctionPreview);
router.patch("/approve/:id", protect, sanctionApprove);
router.patch("/sent-back/:id", protect, sentBack);
router.route("/reject/:id").patch(protect, rejected);

export default router;
