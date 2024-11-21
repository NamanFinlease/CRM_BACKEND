import express from "express";
import {
    activeLeads,
    getActiveLead,
    updateActiveLead,
    closedLeads,
} from "../Controllers/collection.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/active").get(protect, activeLeads);
router
    .route("/active/:loanNo")
    .get(protect, getActiveLead)
    .patch(protect, updateActiveLead);
router.route("/closed").get(protect, closedLeads);

export default router;
