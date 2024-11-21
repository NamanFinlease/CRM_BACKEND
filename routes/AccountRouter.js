import express from "express";
import {
    activeLeadsToVerify,
    verifyActiveLead,
    rejectPaymentVerification,
} from "../Controllers/account.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/active/verify").get(protect, activeLeadsToVerify);
router.route("/active/verify/:loanNo").patch(protect, verifyActiveLead);
router
    .route("/active/verify/reject/:loanNo")
    .patch(protect, rejectPaymentVerification);

export default router;
