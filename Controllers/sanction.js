import asyncHandler from "../middleware/asyncHandler.js";
import Application from "../models/Applications.js";
import Disbursal from "../models/Disbursal.js";
import { dateFormatter } from "../utils/dateFormatter.js";
import { generateSanctionLetter } from "../utils/sendsanction.js";
import { getSanctionData } from "../utils/sanctionData.js";
import Lead from "../models/Leads.js";

// @desc Get the forwarded applications
// @route GET /api/sanction/recommended
// @access Private
export const getRecommendedApplications = asyncHandler(async (req, res) => {
    if (req.activeRole === "sanctionHead") {
        const page = parseInt(req.query.page) || 1; // current page
        const limit = parseInt(req.query.limit) || 10; // items per page
        const skip = (page - 1) * limit;

        const query = {
            isRecommended: true,
            isRejected: { $ne: true },
            isApproved: { $ne: true },
        };

        const applications = await Application.find(query)
            .skip(skip)
            .limit(limit)
            .populate("lead");

        const totalApplications = await Application.countDocuments(query);

        return res.json({
            totalApplications,
            totalPages: Math.ceil(totalApplications / limit),
            currentPage: page,
            applications,
        });
    }
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

        const { application, camDetails, response } = await getSanctionData(id);

        const lead = await Lead.findById({ _id: application.lead });

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
            `${application.applicant.personalDetails.personalEmail}`
        );

        // Return a unsuccessful response
        if (!emailResponse.success) {
            return res.json({ success: false });
        }

        const newDisbursal = new Disbursal({
            application: application._id,
        });

        const disbursalRes = await newDisbursal.save();

        if (!disbursalRes) {
            res.status(400);
            throw new Error("Could not approve this application!!");
        }

        application.sanctionDate = response.sanctionDate;
        application.isApproved = true;
        application.approvedBy = req.employee._id.toString();
        await application.save();

        res.json({
            success: true,
            message: emailResponse.message,
        });
    } else {
        res.status(401);
        throw new Error("You are not authorized!!");
    }
});

// @desc Get all sanctioned applications
// @route GET /api/sanction/approved
// @access Private
export const sanctioned = asyncHandler(async (req, res) => {
    if (req.activeRole === "sanctionHead") {
        const page = parseInt(req.query.page) || 1; // current page
        const limit = parseInt(req.query.limit) || 10; // items per page
        const skip = (page - 1) * limit;

        const query = {
            isApproved: true,
        };

        const applications = await Application.find(query)
            .skip(skip)
            .limit(limit)
            .populate("lead");

        const totalApplications = await Application.countDocuments(query);

        return res.json({
            totalApplications,
            totalPages: Math.ceil(totalApplications / limit),
            currentPage: page,
            applications,
        });
    }
});
