import asyncHandler from "../middleware/asyncHandler.js";
import AadhaarDetails from "../models/AadhaarDetails.js";
import PanDetails from "../models/PanDetails.js";
import Documents from "../models/Documents.js";
import { generateAadhaarOtp, verifyAadhaarOtp } from "../utils/aadhaar.js";
import { panVerify } from "../utils/pan.js";

// @desc Generate Aadhaar OTP.
// @route POST /api/verify/aadhaar/
// @access Private
export const aadhaarOtp = asyncHandler(async (req, res) => {
    const { aadhaar } = req.body;

    // Validate Aaadhaar number (12 digits)
    if (!/^\d{12}$/.test(aadhaar)) {
        return res.status(400).json({
            success: false,
            message: "Aaadhaar number must be a 12-digit number.",
        });
    }

    // Call the function to generate OTP using Aaadhaar number
    const response = await generateAadhaarOtp("", aadhaar);
    // res.render('otpRequest',);

    res.json({
        success: true,
        transactionId: response.data.model.transactionId,
        fwdp: response.data.model.fwdp,
        codeVerifier: response.data.model.codeVerifier,
    });
});

// @desc Verify Aadhaar OTP to fetch Aadhaar details
// @route PATCH /api/verify/aaadhaar-otp/:id
// @access Private
export const saveAadhaarDetails = asyncHandler(async (req, res) => {
    const { otp, transactionId, fwdp, codeVerifier } = req.body;

    // Check if both OTP and request ID are provided
    if (!otp || !transactionId || !fwdp || !codeVerifier) {
        res.status(400);
        throw new Error("Missing fields.");
    }

    // Fetch Aaadhaar details using the provided OTP and request ID
    const response = await verifyAadhaarOtp(
        otp,
        transactionId,
        fwdp,
        codeVerifier
    );

    // Check if the response status code is 422 which is for failed verification
    if (response.code === "200") {
        const details = response.model;
        const name = details.name.split(" ");
        const aadhaarNumber = details.adharNumber.slice(-4);
        const uniqueId = `${name[0].toLowerCase()}${aadhaarNumber}`;

        const existingAadhaar = await AadhaarDetails.findOne({
            uniqueId: uniqueId,
        });

        if (existingAadhaar) {
            await Lead.findByIdAndUpdate(
                id,
                { isAadhaarDetailsSaved: true },
                { new: true }
            );
            return res.json({
                success: true,
                details,
            });
        }

        // await Lead.findByIdAndUpdate(
        //     id,
        //     { isAadhaarDetailsSaved: true },
        //     { new: true }
        // );

        // Save Aaadhaar details in AadharDetails model
        await AadhaarDetails.create({
            uniqueId,
            details,
        });
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

// @desc Verify Pan.
// @route GET /api/mobile/verify/pan/
// @access Private
export const getPanDetails = asyncHandler(async (req, res) => {
    const { name, pan } = req.body;
    console.log(name, pan);

    // Validate that aaadhaar is present in the leads
    if (!pan) {
        res.status(400);
        throw new Error({ success: false, message: "Pan number is required." });
    }

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    // Validate the PAN number
    if (!panRegex.test(pan)) {
        res.status(400);
        throw new Error({ success: false, message: "Invalid PAN!!!" });
    }

    // Call the get panDetails Function
    const response = await panVerify("12345678", pan);

    if (response.result_code !== 101) {
        res.status(400);
        throw new Error("Error with Digitap!");
    }

    if (
        name.toLowerCase() !==
        response.result.data.fullname.trim().toLowerCase()
    ) {
        return res.json({
            nameMatched: false,
            data: response.result,
        });
    }
    // Now respond with status 200 with JSON success true
    return res.json({
        nameMatched: true,
        data: response.result,
    });
});

// @desc Save the pan details once verified.
// @route POST /api/mobile/verify/pan/
// @access Private
export const savePanDetails = asyncHandler(async (req, res) => {
    const { data } = req.body;

    const pan = data.pan;

    await PanDetails.findOneAndUpdate(
        {
            $or: [
                { "data.PAN": pan }, // Check if data.PAN matches
                { "data.pan": pan }, // Check if data.pan matches
            ],
        },
        { data }, // Update data
        { upsert: true, new: true } // Create a new record if not found
    );

    res.json({ success: true });
});
