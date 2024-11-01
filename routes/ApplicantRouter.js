import express from "express";
const router = express.Router();
import { login } from "../Controllers/applicant.js";
import {
    updateApplicantDetails,
    getApplicantDetails,
    updateApplicantBankDetails,
    getApplicantBankDetails,
} from "../Controllers/applicantPersonalDetails.js";
import { protect } from "../middleware/authMiddleware.js";

router.post("/login", login);
router
    .route("/bankDetails/:id")
    .patch(protect, updateApplicantBankDetails)
    .get(protect, getApplicantBankDetails);

router
    .route("/:id")
    .get(protect, getApplicantDetails)
    .patch(protect, updateApplicantDetails);

export default router;
