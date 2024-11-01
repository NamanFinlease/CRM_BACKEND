import express from "express";
import {
    aadhaarOtp,
    verifyAadhaar,
    saveAadhaarDetails,
} from "../Controllers/aadhaarController.js";
import { bankVerification } from "../Controllers/applicantPersonalDetails.js";
import {
    getPanDetails,
    savePanDetails,
    panAadhaarLink,
} from "../Controllers/panController.js";
import {
    emailVerify,
    verifyEmailOtp,
    fetchCibil,
} from "../Controllers/leads.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();

// Bank Verify
router.route("/bank/:id").post(bankVerification);

// aadhaar verify
// router.post('/aadhaar/:id');
router
    .route("/aadhaar/:id")
    .get(protect, aadhaarOtp)
    .post(protect, saveAadhaarDetails);
router.post("/aadhaar-otp/", verifyAadhaar);

// email verify
router.patch("/email/:id", protect, emailVerify);
router.patch("/email-otp/:id", protect, verifyEmailOtp);

// pan verify
router
    .route("/pan/:id")
    .get(protect, getPanDetails)
    .post(protect, savePanDetails);
router.post("/pan-aadhaar-link/:id", panAadhaarLink);

// fetch CIBIL
router.get("/equifax/:id", protect, fetchCibil);
export default router;
