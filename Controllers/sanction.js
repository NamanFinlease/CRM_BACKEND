import asyncHandler from "../middleware/asyncHandler.js";
import Application from "../models/Applications.js";
import { dateFormatter } from "../utils/dateFormatter.js";
import Disbursal from "../models/Disbursal.js";
import { generateSanctionLetter } from "../utils/sendsanction.js";
import { getSanctionData } from "../utils/sanctionData.js";
import { postLogs } from "./logs.js";

import Lead from "../models/Leads.js";
import Sanction from "../models/Sanction.js";

// @desc Get the forwarded applications
// @route GET /api/sanction/recommended
// @access Private
export const getPendingSanctions = asyncHandler(async (req, res) => {
    if (req.activeRole === "sanctionHead") {
        const page = parseInt(req.query.page) || 1; // current page
        const limit = parseInt(req.query.limit) || 10; // items per page
        const skip = (page - 1) * limit;

        const query = {
            isRejected: { $ne: true },
            isApproved: { $ne: true },
        };

        const sanctions = await Sanction.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ updatedAt: -1 })
            .populate({
                path: "application",
                populate: [
                    { path: "lead" },
                    { path: "recommendedBy", select: "fName mName lName" },
                ],
            });

        const applications = await Application;

        const totalSanctions = await Sanction.countDocuments(query);

        return res.json({
            totalSanctions,
            totalPages: Math.ceil(totalSanctions / limit),
            currentPage: page,
            sanctions,
        });
    }
});

// @desc Get the forwarded applications
// @route GET /api/sanction/recommended
// @access Private

export const recommendedApplications = asyncHandler(async(req,res) => {
    if (req.activeRole === "creditManager") {
        const page = parseInt(req.query.page) || 1; // current page
        const limit = parseInt(req.query.limit) || 10; // items per page
        const skip = (page - 1) * limit;

        const query = {
            recommendedBy:req.employee._id.toString(),
            isRejected: { $ne: true },
            onHold: { $ne: true },
            eSigned: { $ne: true },
        };

        const recommended = await Sanction.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ updatedAt: -1 })
            .populate({
                path: "application",
                populate: [
                    { path: "lead" },
                    // { path: "recommendedBy", select: "fName mName lName" },
                ],
            });


        const totalRecommended = await Sanction.countDocuments(query);

        return res.json({
            totalRecommended,
            totalPages: Math.ceil(totalRecommended / limit),
            currentPage: page,
            recommended,
        });
    }

    if (req.activeRole === "sanctionHead" || activeRole === "admin") {
        const page = parseInt(req.query.page) || 1; // current page
        const limit = parseInt(req.query.limit) || 10; // items per page
        const skip = (page - 1) * limit;

        const query = {
            isRejected: { $ne: true },
            onHold: { $ne: true },
            isDisbursed: { $ne: true },
        };

        const recommended = await Sanction.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ updatedAt: -1 })
            .populate({
                path: "application",
                populate: [
                    { path: "lead" },
                    { path: "recommendedBy", select: "fName mName lName" },
                ],
            });


        const totalRecommended = await Sanction.countDocuments(query);

        return res.json({
            totalRecommended,
            totalPages: Math.ceil(totalRecommended / limit),
            currentPage: page,
            recommended,
        });
    }

})

// @desc Get sanction
// @route GET /api/sanctions/:id
// @access Private
export const getSanction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const sanction = await Sanction.findOne({ _id: id }).populate({
        path: "application",
        populate: [
            { path: "lead" },
            { path: "recommendedBy", select: "fName mName lName" },
        ],
    });
    if (!sanction) {
        res.status(404);
        throw new Error("Application not found!!!!");
    }
    return res.json(sanction);
});

// @desc Preview Sanction letter
// @route GET /api/sanction/preview/:id
// @access Private
export const sanctionPreview = asyncHandler(async (req, res) => {
    if (req.activeRole === "sanctionHead") {
        const { id } = req.params;

        const { response } = await getSanctionData(id);

        return res.json({
            ...response,
            sanctionDate: dateFormatter(response.sanctionDate),
        });
    }
});

// @desc Send Sanction letter to applicants
// @route PATCH /api/sanction/approve/:id
// @access Private
export const sanctionApprove = asyncHandler(async (req, res) => {
    if (req.activeRole === "sanctionHead") {
        const { id } = req.params;

        const { sanction, camDetails, response } = await getSanctionData(id);

        const lead = await Lead.findById({ _id: sanction.application.lead });

        // Call the generateSanctionLetter utility function
        const emailResponse = await generateSanctionLetter(
            `SANCTION LETTER - ${response.fullname}`,
            dateFormatter(response.sanctionDate),
            response.title,
            response.fullname,
            response.mobile,
            response.residenceAddress,
            response.stateCountry,
            camDetails,
            lead,
            `${sanction.application.applicant.personalDetails.personalEmail}`
        );

        // Return a unsuccessful response
        if (!emailResponse.success) {
            return res.json({ success: false });
        }

        const newDisbursal = new Disbursal({
            sanction: sanction._id,
        });

        const disbursalRes = await newDisbursal.save();

        if (!disbursalRes) {
            res.status(400);
            throw new Error("Could not approve this application!!");
        }

        sanction.sanctionDate = response.sanctionDate;
        sanction.isApproved = true;
        sanction.approvedBy = req.employee._id.toString();
        await sanction.save();

        const logs = await postLogs(
            sanction.application.lead,
            "SANCTION APPROVED. SEND TO DISBURSAL",
            `${sanction.application.applicant.personalDetails.fName}${
                sanction.application.applicant.personalDetails.mName &&
                ` ${sanction.application.applicant.personalDetails.mName}`
            }${
                sanction.application.applicant.personalDetails.lName &&
                ` ${sanction.application.applicant.personalDetails.lName}`
            }`,
            `Sanction approved by ${req.employee.fName} ${req.employee.lName}`
        );

        return res.json({ success: true, logs });
    } else {
        res.status(401);
        throw new Error("You are not authorized!!");
    }
});

// @desc Get all sanctioned applications
// @route GET /api/sanction/approved
// @access Private
export const sanctioned = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1; // current page
    const limit = parseInt(req.query.limit) || 10; // items per page
    const skip = (page - 1) * limit;
    let query;
    if (req.activeRole === "creditManager") {
        query = {
            creditManagerId:req.employee._id.toString(),
            eSigned: { $ne: true },
        };
    } else if (req.activeRole === "sanctionHead") {
        query = {
            // eSigned: { $eq: true },
            isApproved:{$eq: true},
            isDisbursed: { $ne: true },
        };
    }
    const sanction = await Sanction.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ updatedAt: -1 })
        .populate({
            path: "application",
            populate: [
                { path: "lead" },
                { path: "recommendedBy", select: "fName mName lName" },
            ],
        })

    const totalSanctions = await Sanction.countDocuments(query);

    return res.json({
        totalSanctions,
        totalPages: Math.ceil(totalSanctions / limit),
        currentPage: page,
        sanction,
    });
});
