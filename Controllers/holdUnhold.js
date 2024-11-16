import asyncHandler from "../middleware/asyncHandler.js";
import Lead from "../models/Leads.js";
import Application from "../models/Applications.js";
import Disbursal from "../models/Disbursal.js";
import Sanction from "../models/Sanction.js";
import { postLogs } from "./logs.js";

// @desc Putting lead or application on hold
// @route PATCH /api/leads/hold/:id or /api/applications/hold/:id
// @access Private
export const onHold = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    // List of roles that are authorized to hold a lead
    // const authorizedRoles = [
    //     "admin",
    //     "screener",
    //     "creditManager",
    //     "sanctionHead",
    // ];

    if (!req.employee) {
        res.status(403);
        throw new Error("Not Authorized!!");
    }

    // if (!authorizedRoles.includes(req.employee.empRole)) {
    //     res.status(403);
    //     throw new Error("Not Authorized to hold!!");
    // }

    let lead;
    let application;
    let sanction;
    let disbursal;
    let logs;

    if (req.activeRole === "screener") {
        lead = await Lead.findByIdAndUpdate(
            id,
            { onHold: true, heldBy: req.employee._id },
            { new: true }
        ).populate({ path: "screenerId", select: "fName mName lName" });

        if (!lead) {
            throw new Error("Lead not found");
        }

        logs = await postLogs(
            lead._id,
            "LEAD ON HOLD",
            `${lead.fName}${lead.mName && ` ${lead.mName}`}${
                lead.lName && ` ${lead.lName}`
            }`,
            `Lead on hold by ${lead.screenerId.fName} ${lead.screenerId.lName}`,
            `${reason}`
        );
        return res.json({ lead, logs });
    } else if (req.activeRole === "creditManager") {
        application = await Application.findByIdAndUpdate(
            id,
            { onHold: true, heldBy: req.employee._id },
            { new: true }
        ).populate({ path: "creditManagerId", select: "fName mName lName" });

        if (!application) {
            throw new Error("Application not found");
        }

        logs = await postLogs(
            application.lead._id,
            "APPLICATION ON HOLD",
            `${application.lead.fName}${
                application.lead.mName && ` ${application.lead.mName}`
            }${application.lead.lName && ` ${application.lead.lName}`}`,
            `Application on hold by ${application.creditManagerId.fName} ${application.creditManagerId.lName}`,
            `${reason}`
        );

        return res.json({ application, logs });
    } else if (req.activeRole === "sanctionHead") {
        sanction = await Sanction.findByIdAndUpdate(
            id,
            { onHold: true, heldBy: req.employee._id },
            { new: true }
        ).populate([
            { path: "heldBy", select: "fName mName lName" },
            {
                path: "application",
                populate: { path: "lead" },
            },
        ]);

        if (!sanction) {
            throw new Error("Sanction not found");
        }

        logs = await postLogs(
            sanction.application.lead._id,
            "SANCTION ON HOLD",
            `${sanction.application.lead.fName}${
                sanction.application.lead.mName &&
                ` ${sanction.application.lead.mName}`
            }${
                sanction.application.lead.lName &&
                ` ${sanction.application.lead.lName}`
            }`,
            `SANCTION held by ${sanction.application.heldBy.fName} ${sanction.application.heldBy.lName}`,
            `${reason}`
        );

        return res.json({ sanction, logs });
    } else if (
        req.activeRole === "disbursalManager" ||
        req.activeRole === "disbursalHead"
    ) {
        disbursal = await Disbursal.findByIdAndUpdate(
            id,
            { onHold: true, heldBy: req.employee._id },
            { new: true }
        ).populate([
            {
                path: "sanction",
                populate: {
                    path:"application",
                    populate:"lead"
                },
            },
            { path: "disbursalManagerId", select: "fName mName lName" },
        ]);

        if (!disbursal) {
            throw new Error("Application not found");
        }

        logs = await postLogs(
            disbursal.sanction.application.lead._id,
            "DISBURSAL APPLICATION ON HOLD",
            `${disbursal.sanction.application.lead.fName}${
                disbursal.sanction.application.lead.mName &&
                ` ${disbursal.sanction.application.lead.mName}`
            }${
                disbursal.sanction.application.lead.lName &&
                ` ${disbursal.sanction.application.lead.lName}`
            }`,
            `Disbursal on hold by ${disbursal.sanction.application.creditManagerId.fName} ${disbursal.sanction.application.creditManagerId.lName}`,
            `${reason}`
        );

        return res.json({ disbursal, logs });
    }
});

// @desc Unhold lead or application
// @route PATCH /api/leads/unhold/:id or /api/applications/unhold/:id
// @access Private
export const unHold = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

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
    //     throw new Error("Not Authorized to hold a lead!!");
    // }

    let lead;
    let application;
    let sanction;
    let disbursal;
    let logs;

    if (req.activeRole === "screener") {
        lead = await Lead.findByIdAndUpdate(
            id,
            { onHold: false },
            { new: true }
        ).populate({ path: "screenerId", select: "fName mName lName" });

        if (!lead) {
            throw new Error("Lead not found!!!");
        }

        logs = await postLogs(
            lead._id,
            "LEAD UNHOLD",
            `${lead.fName}${lead.mName && ` ${lead.mName}`}${
                lead.lName && ` ${lead.lName}`
            }`,
            `Lead unhold by ${lead.screenerId.fName} ${lead.screenerId.lName}`,
            `${reason}`
        );
        return res.json({ lead, logs });
    } else if (req.activeRole === "creditManager") {
        application = await Application.findByIdAndUpdate(
            id,
            { onHold: false },
            { new: true }
        ).populate({ path: "creditManagerId", select: "fName mName lName" });

        if (!application) {
            throw new Error("Application not found!!");
        }

        logs = await postLogs(
            application.lead._id,
            "APPLICATION UNHOLD",
            `${application.lead.fName}${
                application.lead.mName && ` ${application.lead.mName}`
            }${application.lead.lName && ` ${application.lead.lName}`}`,
            `Application unhold by ${application.creditManagerId.fName} ${application.creditManagerId.lName}`,
            `${reason}`
        );
        return res.json({ application, logs });
    } else if (req.activeRole === "sanctionHead") {
        sanction = await Sanction.findByIdAndUpdate(
            id,
            { onHold: false },
            { new: true }
        ).populate([
            { path: "heldBy", select: "fName mName lName" },
            {
                path: "application",
                populate: { path: "lead" },
            },
        ]);

        if (!sanction) {
            throw new Error("Sanction not found!!");
        }
        logs = await postLogs(
            sanction.application.lead._id,
            "SANCTION UNHOLD",
            `${sanction.application.lead.fName}${
                sanction.application.lead.mName &&
                ` ${sanction.application.lead.mName}`
            }${
                sanction.application.lead.lName &&
                ` ${sanction.application.lead.lName}`
            }`,
            `Sanction unhold by ${sanction.heldBy.fName} ${sanction.heldBy.lName}`,
            `${reason}`
        );
        return res.json({ sanction, logs });
    } else if (
        req.activeRole === "disbursalManager" ||
        req.activeRole === "disbursalHead"
    ) {
        disbursal = await Disbursal.findByIdAndUpdate(
            id,
            { onHold: false },
            { new: true }
        ).populate([
            {
                path: "sanction",
                populate: { path: "application", populate: { path: "lead" } },
            },
            { path: "heldBy", select: "fName mName lName" },
        ]);

        if (!disbursal) {
            throw new Error("Sanction not found!!");
        }
        logs = await postLogs(
            disbursal.sanction.application.lead._id,
            "DISBURSAL UNHOLD",
            `${disbursal.sanction.application.lead.fName}${
                disbursal.sanction.application.lead.mName &&
                ` ${disbursal.sanction.application.lead.mName}`
            }${
                disbursal.sanction.application.lead.lName &&
                ` ${disbursal.sanction.application.lead.lName}`
            }`,
            `Sanction unhold by ${disbursal.heldBy.fName} ${disbursal.heldBy.lName}`,
            `${reason}`
        );
        return res.json({ disbursal, logs });
    }
});

// @desc Get leads on hold depends on if it's admin or an employee
// @route GET /api/leads/hold
// @access Private
export const getHold = asyncHandler(async (req, res) => {
    // List of roles that are authorized to hold a lead
    // const authorizedRoles = [
    //     "screener",
    //     "admin",
    //     "creditManager",
    //     "sanctionHead",
    // ];

    const page = parseInt(req.query.page) || 1; // current page
    const limit = parseInt(req.query.limit) || 10; // items per page
    const skip = (page - 1) * limit;

    const employeeId = req.employee._id.toString();

    let query = { onHold: true, isRecommended: { $ne: true } };

    if (!req.employee) {
        res.status(403);
        throw new Error("No Employee!!");
    }

    // if (!authorizedRoles.includes(req.employee.empRole)) {
    //     res.status(403);
    //     throw new Error("Not Authorized!!");
    // }

    // If the employee is not admin, they only see the leads they held

    if (
        req.activeRole !== "admin" ||
        req.activeRole !== "sanctionHead" ||
        req.activeRole !== "disbursalHead"
    ) {
        query = {
            ...query,
            heldBy: employeeId,
        };
    }

    let leads;
    let applications;
    let sanctions;
    let disbursals;
    let totalRecords;

    if (req.activeRole === "screener") {
        leads = await Lead.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ updatedAt: -1 });

        totalRecords = await Lead.countDocuments(query);

        return res.json({
            heldLeads: {
                totalRecords,
                totalPages: Math.ceil(totalRecords / limit),
                currentPage: page,
                leads,
            },
        });
    } else if (req.activeRole === "creditManager") {
        applications = await Application.find(query)
            .skip(skip)
            .limit(limit)
            .populate("lead")
            .sort({ updatedAt: -1 });
        totalRecords = await Application.countDocuments(query);

        return res.json({
            heldApplications: {
                totalRecords,
                totalPages: Math.ceil(totalRecords / limit),
                currentPage: page,
                applications,
            },
        });
    } else if (req.activeRole === "disbursalManager") {
        disbursals = await Disbursal.find(query)
            .skip(skip)
            .limit(limit)
            .populate([
                {
                    path: "sanction",
                    populate: {
                        path: "application",
                        populate: {
                            path: "lead",
                        },
                    },
                },
            ])
            .sort({ updatedAt: -1 });
        totalRecords = await Disbursal.countDocuments(query);

        return res.json({
            heldApplications: {
                totalRecords,
                totalPages: Math.ceil(totalRecords / limit),
                currentPage: page,
                disbursals,
            },
        });
    } else {
        leads = await Lead.find(query)
            .skip(skip)
            .limit(limit)
            .populate({ path: "heldBy", select: "fName mName lName" })
            .sort({ updatedAt: -1 });
        const totalLeads = leads.length;

        applications = await Application.find(query)
            .skip(skip)
            .limit(limit)
            .populate("lead")
            .populate({ path: "heldBy", select: "fName mName lName" })
            .sort({ updatedAt: -1 });
        const totalApplications = applications.length;

        sanctions = await Sanction.find(query)
            .skip(skip)
            .limit(limit)
            .populate({ path: "heldBy", select: "fName mName lName" })
            .sort({ updatedAt: -1 });
        const totalSanctions = sanctions.length;

        disbursals = await Disbursal.find(query)
            .skip(skip)
            .limit(limit)
            .populate({ path: "heldBy", select: "fName mName lName" })
            .sort({ updatedAt: -1 });
        const totalDisbursals = disbursals.length;

        return res.json({
            heldLeads: {
                totalLeads,
                totalPages: Math.ceil(totalLeads / limit),
                currentPage: page,
                leads,
            },
            heldApplications: {
                totalApplications,
                totalPages: Math.ceil(totalApplications / limit),
                currentPage: page,
                applications,
            },
            heldSanctions: {
                totalSanctions,
                totalPages: Math.ceil(totalSanctions / limit),
                currentPage: page,
                sanctions,
            },
            heldDisbursals: {
                totalDisbursals,
                totalPages: Math.ceil(totalDisbursals / limit),
                currentPage: page,
                disbursals,
            },
        });
    }
});
