import asyncHandler from "../middleware/asyncHandler.js";
import CamDetails from "../models/CAM.js";
import Disbursal from "../models/Disbursal.js";
import { postLogs } from "./logs.js";

// @desc Get new disbursal
// @route GET /api/disbursals/
// @access Private
export const getNewDisbursal = asyncHandler(async (req, res) => {
    if (req.activeRole === "disbursalManager") {
        const page = parseInt(req.query.page) || 1; // current page
        const limit = parseInt(req.query.limit) || 10; // items per page
        const skip = (page - 1) * limit;

        const query = {
            disbursalManagerId: null,
            isRecommended: { $ne: true },
            isApproved: { $ne: true },
        };

        const disbursals = await Disbursal.find(query)
            .skip(skip)
            .limit(limit)
            .populate({
                path: "application",
                populate: {
                    path: "lead",
                },
            });

        const totalDisbursals = await Disbursal.countDocuments(query);

        return res.json({
            totalDisbursals,
            totalPages: Math.ceil(totalDisbursals / limit),
            currentPage: page,
            disbursals,
        });
    }
});

// @desc Get Disbursal
// @route GET /api/disbursals/:id
// @access Private
export const getDisbursal = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const disbursal = await Disbursal.findOne({ _id: id }).populate({
        path: "application",
        populate: [
            { path: "lead" },
            { path: "creditManagerId" },
            { path: "approvedBy" },
        ],
    });
    const cam = await CamDetails.findOne({
        leadId: disbursal.application.lead._id,
    });
    if (!disbursal) {
        res.status(404);
        throw new Error("Disbursal not found!!!!");
    }
    return res.json(disbursal, cam);
});

// @desc Allocate new disbursal
// @route PATCH /api/disbursals/:id
// @access Private
export const allocateDisbursal = asyncHandler(async (req, res) => {
    const { id } = req.params;
    let disbursalManagerId;

    if (req.activeRole === "disbursalManager") {
        disbursalManagerId = req.employee._id.toString();
    }

    const disbursal = await Disbursal.findByIdAndUpdate(
        id,
        { disbursalManagerId },
        { new: true }
    ).populate({
        path: "application",
        populate: {
            path: "lead",
        },
    });

    if (!disbursal) {
        throw new Error("Application not found"); // This error will be caught by the error handler
    }

    const logs = await postLogs(
        disbursal.application.lead._id,
        "DISBURSAL IN PROCESS",
        `${disbursal.application.lead.fName}${
            disbursal.application.lead.mName &&
            ` ${disbursal.application.lead.mName}`
        } ${disbursal.application.lead.lName}`,
        `Disbursal application approved by ${req.employee.fName} ${req.employee.lName}`
    );

    // Send the updated lead as a JSON response
    return res.json({ disbursal, logs }); // This is a successful response
});

// @desc Get Allocated Disbursal depends on whether if it's admin or a Disbursal Manager.
// @route GET /api/disbursal/allocated
// @access Private
export const allocatedDisbursal = asyncHandler(async (req, res) => {
    let query;
    if (req.activeRole === "admin" || req.activeRole === "disbursalHead") {
        query = {
            disbursalManagerId: {
                $ne: null,
            },
            isRecommended: { $eq: true },
            isApproved: { $ne: true },
        };
    } else if (req.activeRole === "disbursalManager") {
        query = {
            disbursalManagerId: req.employee.id,
            isRecommended: { $ne: true },
        };
    } else {
        res.status(401);
        throw new Error("Not authorized!!!");
    }
    const page = parseInt(req.query.page) || 1; // current page
    const limit = parseInt(req.query.limit) || 10; // items per page
    const skip = (page - 1) * limit;
    const disbursals = await Disbursal.find(query)
        .skip(skip)
        .limit(limit)
        .populate({
            path: "application",
            populate: {
                path: "lead",
            },
        })
        .populate({
            path: "disbursalManagerId",
            select: "fName mName lName",
        })
        .sort({ updatedAt: -1 });

    const totalDisbursals = await Disbursal.countDocuments(query);

    return res.json({
        totalDisbursals,
        totalPages: Math.ceil(totalDisbursals / limit),
        currentPage: page,
        disbursals,
    });
});

// @desc Recommend a disbursal application
// @route PATCH /api/disbursals/recommend/:id
// @access Private
export const recommendDisbursal = asyncHandler(async (req, res) => {
    if (req.activeRole === "disbursalManager") {
        const { id } = req.params;

        // Find the application by its ID
        const disbursal = await Disbursal.findById(id)
            .populate({
                path: "application",
                populate: [{ path: "lead" }],
            })
            .populate({
                path: "disbursalManagerId",
                select: "fName mName lName",
            });

        disbursal.isRecommended = true;
        disbursal.recommendedBy = req.employee._id.toString();
        await disbursal.save();

        const logs = await postLogs(
            disbursal.application.lead._id,
            "DISBURSAL APPLICATION APPROVED. SENDING TO DISBURSAL HEAD",
            `${disbursal.application.lead.fName}${
                disbursal.application.lead.mName &&
                ` ${disbursal.application.lead.mName}`
            } ${disbursal.application.lead.lName}`,
            `Application approved by ${req.employee.fName} ${req.employee.lName}`
        );

        return res.json({ success: true, logs });
    }
});

// @desc Get all the pending disbursal applications
// @route GET /api/disbursals/pending
// @access Private
export const disbursalPending = asyncHandler(async (req, res) => {
    if (
        req.activeRole === "disbursalManager" ||
        req.activeRole === "disbursalHead" ||
        req.activeRole === "admin"
    ) {
        const page = parseInt(req.query.page) || 1; // current page
        const limit = parseInt(req.query.limit) || 10; // items per page
        const skip = (page - 1) * limit;

        const query = {
            disbursalManagerId: { $ne: null },
            isRecommended: { $eq: true },
            isApproved: { $ne: true },
        };

        const disbursals = await Disbursal.find(query)
            .skip(skip)
            .limit(limit)
            .populate({
                path: "application",
                populate: {
                    path: "lead",
                },
            });

        const totalDisbursals = await Disbursal.countDocuments(query);

        return res.json({
            totalDisbursals,
            totalPages: Math.ceil(totalDisbursals / limit),
            currentPage: page,
            disbursals,
        });
    } else {
        res.status(401);
        throw new Error("You are not authorized to check this data");
    }
});

// @desc Get all the disbursed applications
// @route GET /api/disbursals/disbursed
// @access Private
export const disbursed = asyncHandler(async (req, res) => {
    if (req.activeRole === "disbursalHead" || req.activeRole === "admin") {
        const page = parseInt(req.query.page) || 1; // current page
        const limit = parseInt(req.query.limit) || 10; // items per page
        const skip = (page - 1) * limit;

        const query = {
            disbursalManagerId: { $ne: null },
            isApproved: { $eq: true },
        };

        const disbursals = await Disbursal.find(query)
            .skip(skip)
            .limit(limit)
            .populate({
                path: "application",
                populate: {
                    path: "lead",
                },
            });

        const totalDisbursals = await Disbursal.countDocuments(query);

        return res.json({
            totalDisbursals,
            totalPages: Math.ceil(totalDisbursals / limit),
            currentPage: page,
            disbursals,
        });
    } else {
        res.status(401);
        throw new Error("You are not authorized to check this data");
    }
});

// @desc Adding details after the payment is made
// @route PATCH /api/disbursals/approve/:id
// @access Private
export const approveDisbursal = asyncHandler(async (req, res) => {
    if (req.activeRole === "disbursalHead") {
        const { id } = req.params;
        const {
            payableAccount,
            paymentMode,
            amount,
            channel,
            disbursalDate,
            remarks,
        } = req.body;

        const disbursal = await Disbursal.findByIdAndUpdate(
            id,
            {
                payableAccount,
                paymentMode,
                amount,
                channel,
                disbursedAt: disbursalDate,
                remarks,
                isDisbursed: true,
                disbursedBy: req.employee._id.toString(),
            },
            { new: true }
        );
        res.json({ success: true, message: "Disbursed", data: disbursal });
    }
});
