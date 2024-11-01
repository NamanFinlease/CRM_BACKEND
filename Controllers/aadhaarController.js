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
    const response = await generateAadhaarOtp(aadhaar);
    res.json({
        success: true,
        trx_id: response.transaction_id,
    });
});

// @desc Verify Aadhaar OTP to fetch Aadhaar details
// @route PATCH /api/verify/aaadhaar-otp/:id
// @access Private
export const verifyAadhaar = asyncHandler(async (req, res) => {
    const { id, trx_id } = req.query;
    const { otp } = req.body;

    // Check if both OTP and request ID are provided
    if (!otp || !trx_id) {
        res.status(400);
        throw new Error({
            success: false,
            message: "Missing OTP or request ID.",
        });
    }

    // Fetch Aaadhaar details using the provided OTP and request ID
    const response = await verifyAadhaarOtp(otp, trx_id);

    // Check if the response status code is 422 which is for failed verification
    if (!response.success) {
        res.status(response.response_code);
        throw new Error(response.response_message);
    }

    const details = response.result;
    // Respond with a success message
    return res.json({
        success: true,
        details,
    });
});

// @desc Save aadhaar details once verified
// @route POST /api/verify/aadhaar/:id
// @access Private
export const saveAadhaarDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { details } = req.body;

    const name = details.name.split(" ");
    const aadhaar_number = details.aadhaar_number.slice(-4);
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

    await Lead.findByIdAndUpdate(
        id,
        { isMobileVerified: true, isAadhaarVerified: true },
        { new: true }
    );

    // Save Aaadhaar details in AadharDetails model
    await AadhaarDetails.create({
        uniqueId,
        details,
    });
    return res.json({
        success: true,
        details: details,
    });
});
