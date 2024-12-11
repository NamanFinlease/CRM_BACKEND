import asyncHandler from "../middleware/asyncHandler.js";
import CamDetails from "../models/CAM.js";
import Closed from "../models/Closed.js";
import Disbursal from "../models/Disbursal.js";
import { postLogs } from "./logs.js";

// @desc Create a lead to close after collection/recovery
// @route POST /api/collections/
export const createActiveLead = async (pan, loanNo) => {
    try {
        const existingActiveLead = await Closed.findOne({ pan: pan });
        if (!existingActiveLead) {
            const newActiveLead = await Closed.create({
                pan,
                data: [{ loanNo: loanNo }],
            });
            if (!newActiveLead) {
                return { success: false };
            }
            return { success: true };
        } else if (
            existingActiveLead.data.some((entry) => entry.isActive === false)
        ) {
            // If disbursal ID is not found, add the new disbursal
            existingActiveLead.data.push({ loanNo: loanNo });
            const res = await existingActiveLead.save();
            if (!res) {
                return { success: false };
            }
            return { success: true };
        } else {
            return { success: false };
        }
    } catch (error) {
        console.log(error);
    }
};

// @desc Get all active leads
// @route GET /api/collections/active
// @access Private
export const activeLeads = asyncHandler(async (req, res) => {
    if (req.activeRole === "collectionExecutive") {
        // const page = parseInt(req.query.page) || 1; // current page
        // const limit = parseInt(req.query.limit) || 10; // items per page
        // const skip = (page - 1) * limit;

        const pipeline = [
            {
                $match: {
                    // Match the parent document where the data array contains elements
                    // that have isActive: true
                    "data.isActive": true,
                    "data.isDisbursed": true,
                    "data.isClosed": false,
                },
            },
            {
                $project: {
                    pan: 1,
                    data: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$data",
                                    as: "item", // Alias for each element in the array
                                    cond: {
                                        $and: [
                                            { $eq: ["$$item.isActive", true] }, // Condition for isActive
                                            {
                                                $eq: [
                                                    "$$item.isDisbursed",
                                                    true,
                                                ],
                                            },
                                        ],
                                    },
                                },
                            },
                            0,
                        ],
                    },
                },
            },
            {
                $sort: {
                    updatedAt: -1, // Sort by updatedAt in descending order
                },
            },
            // {
            //     $skip: skip,
            // },
            // {
            //     $limit: limit,
            // },
        ];

        // const results = await Closed.aggregate(pipeline);
        const activeLeads = await Closed.aggregate([
            {
                $match: {
                    "data.isActive": true,
                    "data.isDisbursed": true,
                    "data.isClosed": false,
                },
            },
            {
                $addFields: {
                    data: {
                        $filter: {
                            input: "$data",
                            as: "item",
                            cond: {
                                $and: [
                                    { $eq: ["$$item.isActive", true] },
                                    { $eq: ["$$item.isDisbursed", true] },
                                    { $eq: ["$$item.isClosed", false] },
                                ],
                            },
                        },
                    },
                },
            },
            {
                $unwind: "$data", // Ensure `data` becomes a single object, not an array
            },
            {
                $lookup: {
                    from: "disbursals", // Replace with the actual collection name for disbursals
                    localField: "data.disbursal",
                    foreignField: "_id",
                    as: "data.disbursal",
                },
            },
            {
                $unwind: {
                    path: "$data.disbursal",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "sanctions", // Replace with the actual collection name for sanctions
                    localField: "data.disbursal.sanction",
                    foreignField: "_id",
                    as: "data.disbursal.sanction",
                },
            },
            {
                $unwind: {
                    path: "$data.disbursal.sanction",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "applications", // Replace with the actual collection name for applications
                    localField: "data.disbursal.sanction.application",
                    foreignField: "_id",
                    as: "data.disbursal.sanction.application",
                },
            },
            {
                $unwind: {
                    path: "$data.disbursal.sanction.application",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "leads", // Replace with the actual collection name for leads
                    localField: "data.disbursal.sanction.application.lead",
                    foreignField: "_id",
                    as: "data.disbursal.sanction.application.lead",
                },
            },
            {
                $unwind: {
                    path: "$data.disbursal.sanction.application.lead",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "documents", // Replace with the actual collection name for documents
                    localField:
                        "data.disbursal.sanction.application.lead.documents",
                    foreignField: "_id",
                    as: "data.disbursal.sanction.application.lead.documents",
                },
            },
            {
                $sort: { updatedAt: -1 },
            },
        ]);

        // const activeLeads = await Closed.find(
        //     {
        //         "data.isActive": true, // Ensure at least one element in `data` has isActive: true
        //         "data.isDisbursed": true, // Ensure at least one element in `data` has isDisbursed: true
        //         "data.isClosed": false, // Ensure no matching element is closed
        //     },
        //     {
        //         pan: 1, // Include `pan` in the output
        //         data: {
        //             $elemMatch: {
        //                 isActive: true,
        //                 isDisbursed: true,
        //                 isClosed: false,
        //             },
        //         },
        //     }
        // )
        //     .sort({ updatedAt: -1 })
        //     .populate({
        //         path: "data.disbursal",
        //         populate: {
        //             path: "sanction", // Populating the 'sanction' field in Disbursal
        //             populate: [
        //                 { path: "approvedBy" },
        //                 {
        //                     path: "application",
        //                     populate: [
        //                         {
        //                             path: "lead",
        //                             populate: { path: "documents" },
        //                         }, // Nested populate for lead and documents
        //                         { path: "creditManagerId" }, // Populate creditManagerId
        //                         { path: "recommendedBy" },
        //                     ],
        //                 },
        //             ],
        //         },
        //     });

        // Populate the filtered data
        // const activeLeads = await Closed.populate(results, {
        //     path: "data.disbursal",
        //     populate: {
        //         path: "sanction", // Populating the 'sanction' field in Disbursal
        //         populate: [
        //             { path: "approvedBy" },
        //             {
        //                 path: "application",
        //                 populate: [
        //                     { path: "lead", populate: { path: "documents" } }, // Nested populate for lead and documents
        //                     { path: "creditManagerId" }, // Populate creditManagerId
        //                     { path: "recommendedBy" },
        //                 ],
        //             },
        //         ],
        //     },
        // });

        const totalActiveLeads = await Closed.countDocuments({
            "data.isActive": true,
        });

        res.json({
            totalActiveLeads,
            // totalPages: Math.ceil(totalActiveLeads / limit),
            // currentPage: page,
            activeLeads,
        });
    }
});

// @desc Get a specific active leads
// @route GET /api/collections/active/:loanNo
// @access Private
export const getActiveLead = asyncHandler(async (req, res) => {
    const { loanNo } = req.params;

    // const activeRecord = (await Closed.aggregate(pipeline))[0];
    const activeRecord = await Closed.findOne(
        { "data.loanNo": loanNo },
        {
            pan: 1,
            data: {
                $elemMatch: { loanNo: loanNo }, // Match only the specific loanNo
            },
        }
    ).populate({
        path: "data.disbursal",
        populate: {
            path: "sanction", // Populating the 'sanction' field in Disbursal
            populate: [
                { path: "approvedBy" },
                {
                    path: "application",
                    populate: [
                        { path: "lead", populate: { path: "documents" } }, // Nested populate for lead and documents
                        { path: "creditManagerId" }, // Populate creditManagerId
                        { path: "recommendedBy" },
                    ],
                },
            ],
        },
    });

    if (!activeRecord) {
        res.status(404);
        throw new Error({
            success: false,
            message: "Loan number not found.",
        });
    }

    // Fetch the CAM data and add to disbursalObj
    const cam = await CamDetails.findOne({
        leadId: activeRecord?.data?.[0]?.disbursal?.sanction?.application?.lead
            ._id,
    });

    const activeLeadObj = activeRecord.toObject();

    // Extract the matched data object from the array
    const matchedData = activeLeadObj.data[0]; // Since $elemMatch returns a single matching element
    matchedData.disbursal.sanction.application.cam = cam
        ? { ...cam.toObject() }
        : null;

    return res.json({
        pan: activeLeadObj.pan, // Include the parent fields
        data: matchedData, // Send the matched object as a single object
    });
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
                populate: [
                    { path: "approvedBy" },
                    {
                        path: "application",
                        populate: [
                            { path: "lead", populate: { path: "documents" } }, // Nested populate for lead and documents
                            { path: "creditManagerId" }, // Populate creditManagerId
                            { path: "recommendedBy" },
                        ],
                    },
                ],
            },
        });

        // Check if updates are provided
        if (updates && updates.data) {
            const updateQuery = {
                "data.loanNo": loanNo,
            };

            let updateOperation = {};

            if (updates.data.partialPaid) {
                // If partialPaid is present in the updates, push the object into the array
                updateOperation.$push = {
                    "data.$.partialPaid": updates.data.partialPaid,
                    "data.$.requestedStatus": updates.data.requestedStatus,
                };
            } else {
                updateOperation.$set = {
                    "data.$": { ...populatedRecord.data[0], ...updates.data }, // Merge updates
                };
            }

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
    // const page = parseInt(req.query.page) || 1; // current page
    // const limit = parseInt(req.query.limit) || 10; // items per page
    // const skip = (page - 1) * limit;

    const closedLeads = await Closed.find({
        "data.isActive": false,
        "data.isClosed": true,
    })
        .populate({
            path: "data.disbursal",
            populate: {
                path: "sanction", // Populating the 'sanction' field in Disbursal
                populate: [
                    { path: "approvedBy" },
                    {
                        path: "application",
                        populate: [
                            { path: "lead", populate: { path: "documents" } }, // Nested populate for lead and documents
                            { path: "creditManagerId" }, // Populate creditManagerId
                            { path: "recommendedBy" },
                        ],
                    },
                ],
            },
        })
        .sort({ updatedAt: -1 });

    const totalClosedLeads = await Closed.countDocuments({
        "data.isActive": false,
        "data.isClosed": true,
    });

    res.json({
        totalClosedLeads,
        // totalPages: Math.ceil(totalClosedLeads / limit),
        // currentPage: page,
        closedLeads,
    });
    // }
});
