import asyncHandler from "../middleware/asyncHandler.js";
import Lead from "../models/Leads.js";
import Application from "../models/Applications.js";
import Employee from "../models/Employees.js";
import { postLogs } from "./logs.js";

// @desc Rejecting a lead
// @route PATCH /api/leads/reject/:id or /api/applications/reject/:id
// @access Private
export const rejected = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const employee = await Employee.findOne({ _id: req.employee._id });

    // List of roles that are authorized to hold a lead
    // const authorizedRoles = [
    //     "screener",
    //     "admin",
    //     "creditManager",
    //     "sanctionHead",
    // ];

    if (!req.employee) {
        res.status(403);
        throw new Error("Not Authorized!!");
    }

    // if (!authorizedRoles.includes(req.employee.empRole)) {
    //     res.status(403);
    //     throw new Error("Not Authorized to reject a lead!!");
    // }

    let lead;
    let application;
    let logs;

    if (req.activeRole === "screener") {
        lead = await Lead.findByIdAndUpdate(
            id,
            { onHold: false, isRejected: true, rejectedBy: req.employee._id },
            { new: true }
        ).populate({ path: "screenerId", select: "fName mName lName" });

        if (!lead) {
            throw new Error("Lead not found");
        }

        logs = await postLogs(
            lead._id,
            "LEAD REJECTED",
            `${lead.fName} ${lead.mName ?? ""} ${lead.lName}`,
            `Lead rejected by ${lead.screenerId.fName} ${lead.screenerId.lName}`,
            `${reason}`
        );
        return res.json({ lead, logs });
    }

    if (
        req.activeRole === "creditManager" ||
        req.activeRole === "sanctionHead"
    ) {
        application = await Application.findByIdAndUpdate(
            id,
            { isRejected: true, rejectedBy: req.employee._id },
            { new: true }
        ).populate("lead");

        if (!application) {
            throw new Error("Lead not found");
        }

        logs = await postLogs(
            application.lead._id,
            "APPLICATION REJECTED",
            `${application.lead.fName}${
                application.lead.mName && ` ${application.lead.mName}`
            } ${application.lead.lName ?? ""}`,
            `APPLICATION rejected by ${employee.fName} ${employee.lName}`,
            `${reason}`
        );
        return res.json({ application, logs });
    }
});

// @desc Get rejected leads depends on if it's admin or an employee
// @route GET /api/leads/reject
// @access Private
export const getRejected = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1; // current page
    const limit = parseInt(req.query.limit) || 10; // items per page
    const skip = (page - 1) * limit;

    let query = { isRejected: true, isApproved: { $ne: true } };

    if (!req.employee) {
        res.status(403);
        throw new Error("Not Authorized!!");
    }

    // Fetch the leads based on roles
    if (req.activeRole === "screener") {
        const leads = await Lead.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .sort({ updatedAt: -1 });

        const totalLeads = await Lead.countDocuments(query);
        return res.json({
            rejectedLeads: {
                totalLeads,
                totalPages: Math.ceil(totalLeads / limit),
                currentPage: page,
                leads,
            },
        });
    } else if (req.activeRole === "creditManager") {
        const application = await Application.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("lead")
            .sort({ updatedAt: -1 });

        const totalApplications = await Application.countDocuments(query);
        return res.json({
            rejectedApplications: {
                totalApplications,
                totalPages: Math.ceil(totalApplications / limit),
                currentPage: page,
                application,
            },
        });
    } else {
        const leads = await Lead.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({ path: "rejectedBy", select: "fName mName lName" })
            .sort({ updatedAt: -1 });

        const totalLeads = await Lead.countDocuments(query);

        const application = await Application.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("lead")
            .populate({ path: "rejectedBy", select: "fName mName lName" })
            .sort({ updatedAt: -1 });

        const totalApplications = await Application.countDocuments(query);

        return res.json({
            rejectedLeads: {
                totalLeads,
                totalPages: Math.ceil(totalLeads / limit),
                currentPage: page,
                leads,
            },
            rejectedApplications: {
                totalApplications,
                totalPages: Math.ceil(totalApplications / limit),
                currentPage: page,
                application,
            },
        });
    }
});
