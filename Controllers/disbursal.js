import asyncHandler from "../middleware/asyncHandler.js";
import Disbursal from "../models/Disbursal.js";
import Employee from "../models/Employees.js";

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
        populate: {
            path: "lead",
        },
    });
    if (!disbursal) {
        res.status(404);
        throw new Error("Disbursal not found!!!!");
    }
    return res.json(disbursal);
});

// @desc Allocate new disbursal
// @route PATCH /api/disbursals/:id
// @access Private
export const allocateDisbursal = asyncHandler(async (req, res) => {
    const { id } = req.params;
    let disbursalManagerId;

    if (req.activeRole === "disbursalManager") {
        creditManagerId = req.employee._id.toString();
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

    const employee = await Employee.findOne({ _id: disbursalManagerId });
    const logs = await postLogs(
        disbursal.application.lead._id,
        "DISBURSAL IN PROCESS",
        `${disbursal.application.lead.fName} ${
            disbursal.application.lead.mName ?? ""
        } ${disbursal.application.lead.lName}`,
        `Application allocated to ${employee.fName} ${employee.lName}`
    );

    // Send the updated lead as a JSON response
    return res.json({ disbursal, logs }); // This is a successful response
});

// @desc Get Allocated Disbursal depends on whether if it's admin or a Disbursal Manager.
// @route GET /api/disbursal/allocated
// @access Private
export const allocatedApplications = asyncHandler(async (req, res) => {
    let query;
    if (req.activeRole === "admin" || req.activeRole === "disbursalHead") {
        query = {
            disbursalManagerId: {
                $ne: null,
            },
            isRecommended: { $ne: true },
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
