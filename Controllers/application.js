import asyncHandler from "../middleware/asyncHandler.js";
import Application from "../models/Applications.js";
import Employee from "../models/Employees.js";
import { postLogs } from "./logs.js";
import { checkApproval } from "../utils/checkApproval.js";
import CamDetails from "../models/CAM.js";

// @desc Get all applications
// @route GET /api/applications
// @access Private
export const getAllApplication = asyncHandler(async (req, res) => {
    if (req.activeRole === "screener") {
        res.status(401);
        throw new Error("Screeners doesn't have the authorization.");
    }
    const page = parseInt(req.query.page) || 1; // current page
    const limit = parseInt(req.query.limit) || 10; // items per page
    const skip = (page - 1) * limit;

    const query = {
        $or: [
            { creditManagerId: { $exists: false } },
            { creditManagerId: null },
        ],
        isRecommended: { $ne: true },
    };

    const applications = await Application.find(query)
        .skip(skip)
        .limit(limit)
        .populate({
            path: "lead",
            populate: {
                path: "recommendedBy",
            },
        })
        .sort({ updatedAt: -1 });
    const totalApplications = await Application.countDocuments(query);

    return res.json({
        totalApplications,
        totalPages: Math.ceil(totalApplications / limit),
        currentPage: page,
        applications,
    });
});

// @desc Get application
// @route GET /api/applications/:id
// @access Private
export const getApplication = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const application = await Application.findOne({ _id: id }).populate("lead");
    if (!application) {
        res.status(404);
        throw new Error("Application not found!!!!");
    }
    return res.json(application);
});

// @desc Allocate new application
// @route PATCH /api/applications/:id
// @access Private
export const allocateApplication = asyncHandler(async (req, res) => {
    // Check if screener exists in the request
    const { id } = req.params;
    let creditManagerId;

    if (req.activeRole === "admin") {
        creditManagerId = req.body.creditManagerId;
    } else if (req.activeRole === "creditManager") {
        creditManagerId = req.employee._id.toString();
    }

    const application = await Application.findByIdAndUpdate(
        id,
        { creditManagerId },
        { new: true }
    ).populate("lead");

    if (!application) {
        throw new Error("Application not found"); // This error will be caught by the error handler
    }
    const employee = await Employee.findOne({ _id: creditManagerId });
    const logs = await postLogs(
        application.lead._id,
        "APPLICATION IN PROCESS",
        `${application.lead.fName} ${application.lead.mName ?? ""} ${
            application.lead.lName
        }`,
        `Application allocated to ${employee.fName} ${employee.lName}`
    );

    // Send the updated lead as a JSON response
    return res.json({ application, logs }); // This is a successful response
});

// @desc Get Allocated Applications depends on whether if it's admin or a creditManager.
// @route GET /api/applications/allocated
// @access Private
export const allocatedApplications = asyncHandler(async (req, res) => {
    let query;
    if (req.activeRole === "admin" || req.activeRole === "sanctionHead") {
        query = {
            creditManagerId: {
                $ne: null,
            },
            onHold: { $ne: true },
            isRejected: { $ne: true },
            isRecommended: { $ne: true },
        };
    } else if (req.activeRole === "creditManager") {
        query = {
            creditManagerId: req.employee.id,
            onHold: { $ne: true },
            isRejected: { $ne: true },
            isRecommended: { $ne: true },
        };
    } else {
        res.status(401);
        throw new Error("Not authorized!!!");
    }
    const page = parseInt(req.query.page) || 1; // current page
    const limit = parseInt(req.query.limit) || 10; // items per page
    const skip = (page - 1) * limit;
    const applications = await Application.find(query)
        .skip(skip)
        .limit(limit)
        .populate("lead")
        .populate("creditManagerId")
        .sort({ updatedAt: -1 });

    console.log("aapplication", query, applications);

    const totalApplications = await Application.countDocuments(query);

    return res.json({
        totalApplications,
        totalPages: Math.ceil(totalApplications / limit),
        currentPage: page,
        applications,
    });
});

// @desc Adding CAM details
// @access Private
export const postCamDetails = async (leadId, cibilScore, loanAmount) => {
    const details = { cibilScore: cibilScore, loanAmount: loanAmount };

    await CamDetails.create({
        leadId: leadId,
        details: details,
    });

    return { success: true };
};

// @desc get CAM details
// @route GET /api/applications/cam/:id
// @access Private
export const getCamDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const application = await Application.findById(id);
    if (!application) {
        res.status(404);
        throw new Error("Application not found!!");
    }

    const cam = await CamDetails.findOne({
        leadId: application.lead,
    });

    if (!cam) {
        return { success: false, message: "No record found!!" };
    }

    res.json({ details: cam });
});

// @desc Update CAM details
// @route PATCH /api/applications/cam/:id
// @access Private
export const updateCamDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { details } = req.body;

    const application = await Application.findById(id)
        .populate("lead")
        .populate("creditManagerId");
    if (!application) {
        res.status(404);
        throw new Error("Application not found!!");
    }

    if (
        req.employee._id.toString() ===
        application.creditManagerId._id.toString()
    ) {
        // Find the CamDetails associated with the application (if needed)
        let cam = await CamDetails.findOne({
            leadId: application.lead._id.toString(),
        });

        if (!cam) {
            return res.json({ success: false, message: "No CAM found!!" });
        }

        // Update only the fields that are sent from the frontend
        cam.details = { ...cam.details, ...details };
        await cam.save();

        const logs = await postLogs(
            application.lead._id,
            "APPLICATION IN PROCESS",
            `${application.lead.fName} ${application.lead.mName ?? ""} ${
                application.lead.lName
            }`,
            `CAM details added by ${application.creditManagerId.fName} ${application.creditManagerId.lName}`,
            `${cam.details?.loanAmount} ${cam.details?.loanRecommended} ${cam.details?.netDisbursalAmount} ${cam.details?.disbursalDate} ${cam.details?.repaymentDate} ${cam.details?.eligibleTenure} ${cam.details?.repaymentAmount}`
        );

        res.json({ success: true, log: logs });
    } else {
        res.status(401);
        throw new Error("You are not authorized to update CAM!!");
    }
});

// @desc Forward the Application to Sanction head
// @route Patch /api/applications/recommended/:id
// @access Private
export const recommendedApplication = asyncHandler(async (req, res) => {
    if (req.activeRole === "creditManager") {
        const { id } = req.params;

        // Find the application by its ID
        const application = await Application.findById(id)
            .populate("lead")
            .populate("creditManagerId");

        if (!application) {
            throw new Error("Application not found"); // This error will be caught by the error handler
        }

        if (
            req.employee._id.toString() ===
            application.creditManagerId._id.toString()
        ) {
            const result = await checkApproval(
                {},
                application,
                "",
                req.employee._id.toString()
            );
            if (!result.approved) {
                return res
                    .status(400)
                    .json({ success: false, message: result.message });
            }
            // Approve the lead by updating its status
            application.isRecommended = true;
            application.recommendedBy = req.employee._id;
            await application.save();

            const logs = await postLogs(
                application.lead._id,
                "APPLICATION FORWARDED. TRANSFERED TO SACNTION HEAD",
                `${application.lead.fName} ${application.lead.mName ?? ""} ${
                    application.lead.lName
                }`,
                `Application forwarded by ${application.creditManagerId.fName} ${application.creditManagerId.lName}`
            );
            return res.json(logs);
        } else {
            res.status(401);
            throw new Error(
                "You are not authorized to recommend this application!!"
            );
        }
    } else {
        res.status(401);
        throw new Error("You are not authorized!!!");
    }
});
