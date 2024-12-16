import express from "express";
import {
    aadhaarOtp,
    verifyAadhaar,
    saveAadhaarDetails,
    generateAadhaarLink,
    checkAadhaarDetails,
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
    cibilReport,
    mobileGetOtp,
    verifyOtp,
} from "../Controllers/leads.js";
import { aadhaarMiddleware, protect } from "../middleware/authMiddleware.js";
const router = express.Router();

// Mobile Verify
router.post("/mobile/get-otp", mobileGetOtp);
router.post("/mobile/verify-otp", verifyOtp);

// Bank Verify
router.route("/bank/:id").post(bankVerification);

// send Aadhaar verification mail
router.route("/generate-link/:id").get(generateAadhaarLink);

// aadhaar verify
// router.post('/aadhaar/:id');
router.route("/aadhaar").get(aadhaarMiddleware, aadhaarOtp);
// Aadhaar OTP submitted by Borrower
router.post("/submit-aadhaar-otp", aadhaarMiddleware, saveAadhaarDetails);
router
    .route("/verifyAadhaar/:id")
    .get(protect, checkAadhaarDetails)
    .patch(protect, verifyAadhaar);

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
router.get("/equifax-report/:id", protect, cibilReport);
export default router;
