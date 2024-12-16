import asyncHandler from "../middleware/asyncHandler.js";
import Lead from "../models/Leads.js";
import { generateAadhaarOtp, verifyAadhaarOtp } from "../utils/aadhaar.js";
import AadhaarDetails from "../models/AadhaarDetails.js";
import sendEmail from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";
import { aadhaarKyc } from "../utils/smsGateway.js";

// @desc Generate Aadhaar OTP.
// @route GET /api/verify/mail/:id
// @access Private
export const generateAadhaarLink = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const lead = await Lead.findById(id);
    const { personalEmail, fName, mName, lName, _id } = lead;
    const token = jwt.sign({ _id }, process.env.AADHAAR_LINK_SECRET, {
        expiresIn: "5m",
    });
    req.session.token = token;

    const customerName = `${fName}${mName && ` ${mName}`} ${lName}`;
    const link = `https://api.fintechbasket.com/verify-aadhaar/${token}`;
    const result = await aadhaarKyc(lead.mobile, lead.fName, lead.lName, link);

    if (result.data.ErrorMessage === "Success") {
        console.log("Link sent on mobile!!");
        await sendEmail(personalEmail, customerName, `Aadhaar verification`);
        return res.json({
            success: true,
            message: "Link sent successfully on mobile and email.",
        });
    }
    // return res.json({
    //     success: true,
    //     message: "Link sent successfully on mobile and email.",
    // });

    return res
        .status(500)
        .json({ success: false, message: "Failed to send OTP" });
});

// @desc Generate Aadhaar OTP.
// @route POST /api/verify/aadhaar/:id
// @access Private
export const aadhaarOtp = asyncHandler(async (req, res) => {
    const id = req.userLeadId;

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
    const id = req.userLeadId;
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

        await Lead.findByIdAndUpdate(
            id,
            { isAadhaarDetailsSaved: true },
            { new: true }
        );

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

    // // Check if the response status code is 422 which is for failed verification
    // if (!response.success) {
    //     res.status(response.response_code);
    //     throw new Error(response.response_message);
    // }

    // const details = response.result;
    // // Respond with a success message
    // return res.json({
    //     success: true,
    //     details,
    // });
});

// @desc Save aadhaar details once verified
// @route POST /api/verify/aadhaar/:id
// @access Private
// export const saveAadhaarDetails = asyncHandler(async (req, res) => {
//     const { id } = req.params;
//     const { details } = req.body;

//     const name = details.name.split(" ");
//     const aadhaar_number = details.aadhaar_number.slice(-4);
//     const uniqueId = `${name[0]}${aadhaar_number}`;

//     const existingAadhaar = await AadhaarDetails.findOne({
//         uniqueId: uniqueId,
//     });

//     if (existingAadhaar) {
//         await Lead.findByIdAndUpdate(
//             id,
//             { isMobileVerified: true, isAadhaarVerified: true },
//             { new: true }
//         );
//         return res.json({
//             success: true,
//             details,
//         });
//     }

//     await Lead.findByIdAndUpdate(
//         id,
//         { isMobileVerified: true, isAadhaarVerified: true },
//         { new: true }
//     );

//     // Save Aaadhaar details in AadharDetails model
//     await AadhaarDetails.create({
//         uniqueId,
//         details,
//     });

//     return res.json({
//         success: true,
//         details: details,
//     });
// });

// @desc Generate Aadhaar OTP.
// @route GET /api/verify/verifyAadhaar/:id
// @access Private
export const checkAadhaarDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const lead = await Lead.findById(id);
    const { fName, aadhaar } = lead;
    const uniqueId = `${fName.toLowerCase()}${aadhaar.slice(-4)}`;
    const data = await AadhaarDetails.findOne({ uniqueId });

    // res.render('otpRequest',);

    res.json({
        success: true,
        data,
    });
});

// @desc Verify Aadhaar OTP to fetch Aadhaar details
// @route PATCH /api/verify/verify/:id
// @access Private
export const verifyAadhaar = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await Lead.findByIdAndUpdate(
        id,
        { isAadhaarVerified: true },
        { new: true }
    );
    return res.json({
        success: true,
    });
});
