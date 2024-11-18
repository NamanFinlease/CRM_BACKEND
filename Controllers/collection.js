import asyncHandler from "../middleware/asyncHandler.js";
import Closed from "../models/Closed.js";
import Disbursal from "../models/Disbursal.js";
import { postLogs } from "./logs.js";

// @desc Create a lead to close after collection/recovery
// @route POST /api/collections/
export const createActiveLead = async (pan, loanNo, disbursal) => {
    try {
        const existingActiveLead = await Closed.findOne({ pan: pan });
        if (!existingActiveLead) {
            const newActiveLead = await Closed.create({
                pan,
                data: [{ loanNo: loanNo, disbursal: disbursal }],
            });
            if (!newActiveLead) {
                return { success: false };
            }
            return { success: true };
        }
        // else {
        //     // If the lead already exists, check if the disbursal ID is already in the data array
        //     const doesDisbursalExist = existingActiveLead.data.some(
        //         (entry) => entry.disbursal.toString() === disbursal.toString()
        //     );

        //     if (doesDisbursalExist) {
        //         throw new Error("Disbursal ID already exists.");
        //     }
        //     // If disbursal ID is not found, add the new disbursal
        //     existingActiveLead.data.push({ disbursal: disbursal });
        //     const res = await existingActiveLead.save();
        //     if (!res) {
        //         return { success: false };
        //     }
        //     return { success: true };
        // }
    } catch (error) {
        console.log(error);
    }
};

// @desc Get all active leads
// @route GET /api/collections/active
// @access Private
export const activeLeads = asyncHandler(async (req, res) => {
    if (req.activeRole === "collectionExecutive") {
        const page = parseInt(req.query.page) || 1; // current page
        const limit = parseInt(req.query.limit) || 10; // items per page
        const skip = (page - 1) * limit;

        const pipeline = [
            {
                $match: {
                    // Match the parent document where the data array contains elements
                    // that have isActive: true
                    "data.isActive": true,
                },
            },
            {
                $project: {
                    data: {
                        $filter: {
                            input: "$data",
                            as: "item", // Alias for each element in the array
                            cond: {
                                $and: [
                                    { $eq: ["$$item.isActive", true] }, // Condition for isActive
                                ],
                            },
                        },
                    },
                },
            },
        ];

        const results = await Closed.aggregate(pipeline);

        // Populate the filtered data
        const activeLeads = await Closed.populate(results, {
            path: "data.disbursal",
            populate: {
                path: "sanction", // Populating the 'sanction' field in Disbursal
                populate: {
                    path: "application", // Inside 'sanction', populate the 'application' field
                    populate: [
                        { path: "lead" },
                        { path: "creditManagerId" },
                        { path: "recommendBy" },
                    ],
                },
            },
        });

        const totalActiveLeads = await Closed.countDocuments({
            "data.isActive": true,
        });

        res.json({
            totalActiveLeads,
            totalPages: Math.ceil(totalActiveLeads / limit),
            currentPage: page,
            activeLeads,
        });
    }
});

// @desc Get a specific active leads
// @route GET /api/collections/active/:loanNo
// @access Private
export const getActiveLead = asyncHandler(async (req, res) => {
    const { loanNo } = req.params;

    const pipeline = [
        {
            $match: { "data.loanNo": loanNo }, // Match documents where the data array contains the loanNo
        },
        {
            $project: {
                data: {
                    $filter: {
                        input: "$data",
                        as: "item", // Alias for each element in the array
                        cond: { $eq: ["$$item.loanNo", loanNo] }, // Condition to match
                    },
                },
            },
        },
    ];

    const activeRecord = (await Closed.aggregate(pipeline))[0];

    if (!activeRecord) {
        res.status(404);
        throw new Error({
            success: false,
            message: "Loan number not found.",
        });
    }

    // Populate the filtered data
    const populatedRecord = await Closed.populate(activeRecord, {
        path: "data.disbursal",
        populate: {
            path: "sanction", // Populating the 'sanction' field in Disbursal
            populate: {
                path: "application", // Inside 'sanction', populate the 'application' field
                populate: [
                    { path: "lead" },
                    { path: "creditManagerId" },
                    { path: "recommendBy" },
                ],
            },
        },
    });
    if (!populatedRecord) {
        res.status(404);
        throw new Error({
            success: false,
            message: "Loan number not found.",
        });
    }

    // Convert activeLead to a plain object to make it mutable
    let activeLeadObj = populatedRecord.toObject();

    // Fetch the CAM data and add to disbursalObj
    const cam = await CamDetails.findOne({
        leadId: populatedRecord?.data?.disbursal?.sanction?.application?.lead
            ._id,
    });
    activeLeadObj.data.disbursal.sanction.application.cam = cam
        ? { ...cam.toObject() }
        : null;

    return res.json({ activeLead: activeLeadObj });
});

// @desc Update an active lead after collection/recovery
// @route PATCH /api/collections/active/:loanNo
// @access Private
export const updateActiveLead = asyncHandler(async (req, res) => {
    if (req.activeRole === "collectionExecutive") {
        const { loanNo } = req.params;
        const updates = req.body;

        const pipeline = [
            {
                $match: { "data.loanNo": loanNo }, // Match documents where the data array contains the loanNo
            },
            {
                $project: {
                    data: {
                        $filter: {
                            input: "$data",
                            as: "item", // Alias for each element in the array
                            cond: { $eq: ["$$item.loanNo", loanNo] }, // Condition to match
                        },
                    },
                },
            },
        ];

        const activeRecord = (await Closed.aggregate(pipeline))[0];

        if (!activeRecord || !activeRecord.data?.length) {
            res.status(404);
            throw new Error({
                success: false,
                message: "Loan number not found.",
            });
        }

        // Populate the filtered data
        const populatedRecord = await Closed.populate(activeRecord, {
            path: "data.disbursal",
            populate: {
                path: "sanction", // Populating the 'sanction' field in Disbursal
                populate: {
                    path: "application", // Inside 'sanction', populate the 'application' field
                    populate: [
                        { path: "lead" },
                        { path: "creditManagerId" },
                        { path: "recommendBy" },
                    ],
                },
            },
        });

        // Check if updates are provided
        if (updates && updates.data) {
            const updateQuery = {
                "data.loanNo": loanNo,
            };
            const updateOperation = {
                $set: {
                    "data.$": { ...populatedRecord.data[0], ...updates.data }, // Merge updates
                },
            };

            const updatedRecord = await Closed.findOneAndUpdate(
                updateQuery,
                updateOperation,
                { new: true } // Return the updated document
            );

            if (updatedRecord) {
                return res.json({
                    success: true,
                    message: "Record updated successfully.",
                });
            } else {
                res.status(404);
                throw new Error("Unable to update the record.");
            }
        }
    }
    // If no updates or empty data, return a successful response with no changes
    return res.json({
        success: true,
        message: "No changes made. Record remains unchanged.",
    });
});

// @desc Get all the closed leads
// @route GET /api/collections/closed/
// @access Private
export const closedLeads = asyncHandler(async (req, res) => {
    // if (req.activeRole === "accountExecutive") {
    const page = parseInt(req.query.page) || 1; // current page
    const limit = parseInt(req.query.limit) || 10; // items per page
    const skip = (page - 1) * limit;

    const pipeline = [
        {
            $match: {
                // Match the parent document where the data array contains elements
                // that have isActive: false and isClosed: true
                "data.isActive": false,
                "data.isClosed": true,
            },
        },
        {
            $project: {
                data: {
                    $filter: {
                        input: "$data",
                        as: "item", // Alias for each element in the array
                        cond: {
                            $and: [
                                { $eq: ["$$item.isActive", false] }, // Condition for isActive
                                { $eq: ["$$item.isClosed", true] }, // Condition for isClosed
                            ],
                        },
                    },
                },
            },
        },
    ];

    const results = await Closed.aggregate(pipeline);

    // Populate the filtered data
    const populatedRecord = await Closed.populate(results, {
        path: "data.disbursal",
        populate: {
            path: "sanction", // Populating the 'sanction' field in Disbursal
            populate: {
                path: "application", // Inside 'sanction', populate the 'application' field
                populate: [
                    { path: "lead" },
                    { path: "creditManagerId" },
                    { path: "recommendBy" },
                ],
            },
        },
    });

    const totalClosedLeads = await Closed.countDocuments({
        "data.isActive": false,
        "data.isClosed": true,
    });

    res.json({
        totalClosedLeads,
        totalPages: Math.ceil(totalClosedLeads / limit),
        currentPage: page,
        populatedRecord,
    });
    // }
});