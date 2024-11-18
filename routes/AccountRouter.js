import express from "express";
import {
    activeLeadsToVerify,
    verifyActiveLead,
} from "../Controllers/account.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/active/verify").get(protect, activeLeadsToVerify);
router.route("/active/verify/:loanNo").patch(protect, verifyActiveLead);

export default router;
