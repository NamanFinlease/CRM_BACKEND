import asyncHandler from "../middleware/asyncHandler.js";
import Lead from "../models/Leads.js";
import { generateAadhaarOtp, verifyAadhaarOtp } from "../utils/aadhaar.js";
import AadhaarDetails from "../models/AadhaarDetails.js";

// @desc Generate Aadhaar OTP.
// @route POST /api/verify/aadhaar/:id
// @access Private
export const aadhaarOtp = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const lead = await Lead.findById(id);
    const aadhaar = lead?.aadhaar;

    // Validate Aaadhaar number (12 digits)
    if (!/^\d{12}$/.test(aadhaar)) {
        return res.status(400).json({
            success: false,
            message: "Aaadhaar number must be a 12-digit number.",
        });
    }

    // Call the function to generate OTP using Aaadhaar number
    const response = await generateAadhaarOtp(id, aadhaar);

    res.json({
        success: true,
        transactionId: response.model.transactionId,
        fwdp: response.model.fwdp,
        codeVerifier: response.model.codeVerifier,
    });
});

// @desc Verify Aadhaar OTP to fetch Aadhaar details
// @route PATCH /api/verify/aaadhaar-otp/:id
// @access Private
export const verifyAadhaar = asyncHandler(async (req, res) => {
    const { id } = req.query;
    const { otp, transactionId, fwdp, codeVerifier } = req.body;

    // Check if both OTP and request ID are provided
    if (!otp || !transactionId || !fwdp || !codeVerifier) {
        res.status(400);
        throw new Error({
            success: false,
            message: "Missing fields.",
        });
    }

    // Fetch Aaadhaar details using the provided OTP and request ID
    const response = await verifyAadhaarOtp(
        id,
        otp,
        transactionId,
        fwdp,
        codeVerifier
    );

    console.log("response: ", response);

    // Check if the response status code is 422 which is for failed verification
    if (response.code === "200") {
        const details = response.model;
        // Respond with a success message
        return res.json({
            success: true,
            details,
        });
    }
    const code = parseInt(response.code, 10);
    res.status(code);
    throw new Error(response.msg);
});

// @desc Save aadhaar details once verified
// @route POST /api/verify/aadhaar/:id
// @access Private
export const saveAadhaarDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { details } = req.body;

    const name = details.name.split(" ");
    const aadhaar_number = details.adharNumber.slice(-4);
    const uniqueId = `${name[0]}${aadhaar_number}`;

    const existingAadhaar = await AadhaarDetails.findOne({
        uniqueId: uniqueId,
    });

    if (existingAadhaar) {
        await Lead.findByIdAndUpdate(
            id,
            { isMobileVerified: true, isAadhaarVerified: true },
            { new: true }
        );
        return res.json({
            success: true,
            details,
        });
    }
    // Save Aaadhaar details in AadharDetails model
    await AadhaarDetails.create({
        uniqueId,
        details,
    });

    await Lead.findByIdAndUpdate(
        id,
        { isMobileVerified: true, isAadhaarVerified: true },
        { new: true }
    );

    return res.json({
        success: true,
        details: details,
    });
});
