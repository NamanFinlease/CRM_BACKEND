import asyncHandler from "../middleware/asyncHandler.js";
import Closed from "../models/Closed.js";

// @desc Get all the updated Active leads to verify
// @route GET /api/accounts/active/verify
// @access Private
export const activeLeadsToVerify = asyncHandler(async (req, res) => {
    if (
        req.activeRole === "accountExecutive" ||
        req.activeRole === "collectionExecutive"
    ) {
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
                    "data.isVerified": false,
                    "data.isClosed": false,
                    $or: [
                        { "data.date": { $exists: true, $ne: null } },
                        { "data.amount": { $exists: true, $ne: 0 } },
                        { "data.utr": { $exists: true, $ne: 0 } },
                        {
                            "data.partialPaid": {
                                $elemMatch: {
                                    date: { $exists: true, $ne: null },
                                    amount: { $exists: true, $gt: 0 },
                                    utr: { $exists: true },
                                    isPartlyPaid: { $ne: true },
                                },
                            },
                        },
                        {
                            "data.requestedStatus": {
                                $exists: true,
                                $ne: null,
                            },
                        },
                        { "data.dpd": { $exists: true, $gt: 0 } },
                    ],
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
                                    { $eq: ["$$item.isDisbursed", true] },
                                ],
                            },
                        },
                    },
                },
            },
            {
                $addFields: {
                    data: { $arrayElemAt: ["$data", 0] }, // Extract the first matching object
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

        const results = await Closed.aggregate(pipeline).sort({
            updatedAt: -1,
        });
        // Populate the filtered data
        const leadsToVerify = await Closed.populate(results, {
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

        const totalActiveLeadsToVerify = await Closed.countDocuments({
            "data.isActive": true,
            "data.isDisbursed": true,
            "data.isVerified": false,
            "data.isClosed": false,
            $or: [
                { "data.closingDate": { $exists: true, $ne: null } },
                { "data.closingAmount": { $exists: true, $ne: 0 } },
                {
                    "data.partialPaid": {
                        $elemMatch: {
                            date: { $exists: true, $ne: null },
                            amount: { $exists: true, $gt: 0 },
                        },
                    },
                },
                { "data.requestedStatus": { $exists: true, $ne: null } },
                { "data.dpd": { $exists: true, $gt: 0 } },
            ],
        });

        res.json({
            totalActiveLeadsToVerify,
            // totalPages: Math.ceil(totalActiveLeadsToVerify / limit),
            // currentPage: page,
            leadsToVerify,
        });
    }
});

// @desc Verify the active lead if the payment is received and change its status
// @route PATCH /api/accounts/active/verify/:loanNo
// @access Private
export const verifyActiveLead = asyncHandler(async (req, res) => {
    if (req.activeRole === "accountExecutive") {
        const { loanNo } = req.params;
        const { utr, status } = req.body;

        const loanEntry = await Closed.findOne(
            { "data.loanNo": loanNo }, // Match documents where data array contains loanNo
            {
                "data.$": 1, // Project only the matching element in the data array
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

        if (!loanEntry || !loanEntry.data?.length) {
            res.status(404);
            throw new Error({
                success: false,
                message: "Loan number not found.",
            });
        }

        // Ensure the status selected by the account executive matches the requestedStatus
        if (
            loanEntry.data[0].partialPaid.length > 0 &&
            loanEntry.data[0].partialPaid.some((item) => !item.isPartlyPaid)
        ) {
            const index = loanEntry.data[0].partialPaid.findIndex(
                (item) => item.utr === utr
            );

            if (
                loanEntry.data[0].partialPaid[index].requestedStatus === status
            ) {
                // Update the specific partialPaid item and any required flags
                const updateQuery = {
                    $set: {
                        "data.$[dataElem].partialPaid.$[partialElem].isPartlyPaid": true,
                    },
                };
                const arrayFilters = [
                    { "dataElem.loanNo": loanNo }, // Match the correct data array
                    { "partialElem.utr": utr }, // Match the correct partialPaid item
                ];
                await Closed.updateOne(
                    { "data.loanNo": loanNo }, // Query to find the document
                    updateQuery, // Fields to update
                    { arrayFilters } // Filters for nested array elements
                );
            }
        } else if (loanEntry.data[0].requestedStatus === status) {
            // Handle broader loanEntry field updates based on requestedStatus
            const flagUpdates = {}; // Initialize flag updates

            switch (status) {
                case "settled":
                    flagUpdates["data.$[dataElem].isSettled"] = true;
                    flagUpdates["data.$[dataElem].isVerified"] = true;
                    flagUpdates["data.$[dataElem].isActive"] = false;
                    break;
                case "closed":
                    flagUpdates["data.$[dataElem].isClosed"] = true;
                    flagUpdates["data.$[dataElem].isVerified"] = true;
                    flagUpdates["data.$[dataElem].isActive"] = false;
                    break;
                case "writeOff":
                    flagUpdates["data.$[dataElem].isWriteOff"] = true;
                    flagUpdates["data.$[dataElem].defaulted"] = true;
                    flagUpdates["data.$[dataElem].isVerified"] = true;
                    flagUpdates["data.$[dataElem].isActive"] = false;
                    break;
                default:
                    res.status(400);
                    throw new Error(
                        `Invalid status "${status}". Unable to update loan entry.`
                    );
            }
            // Update broader fields with constructed flags
            await Closed.updateOne(
                { "data.loanNo": loanNo },
                { $set: flagUpdates },
                { arrayFilters: [{ "dataElem.loanNo": loanNo }] }
            );
        } else {
            res.status(400);
            throw new Error(
                "Contact the Collection Executive because the status they requested is different from what you're trying to do!!"
            );
        }

        // Send a success response indicating the status was successfully verified
        return res.json({
            success: true,
            message: `Record updated successfully. Status ${status} is now verified.`,
        });
    }
});

// @desc Reject the payment verification if the payment is not received and remove the requested status
// @route PATCH /api/accounts/active/verify/reject/:loanNo
// @access Private
export const rejectPaymentVerification = asyncHandler(async (req, res) => {
    if (req.activeRole === "accountExecutive") {
        const { loanNo } = req.params;
        const { utr } = req.body;

        // Find the document containing the specific loanNo in the `data` array
        const activeRecord = await Closed.findOne(
            {
                "data.loanNo": loanNo,
                $or: [{ "data.utr": utr }, { "data.partialPaid.utr": utr }],
            },
            {
                pan: 1, // Include only necessary fields
                "data.partialPaid": 1, // Return only the partialPaid array
                "data.loanNo": 1,
                // data: { $elemMatch: { loanNo: loanNo } }, // Fetch only the matched data entry
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

        if (!activeRecord || !activeRecord.data?.length) {
            res.status(404);
            throw new Error({
                success: false,
                message: "Loan number not found.",
            });
        }

        // Remove the `requestedStatus` field
        await Closed.updateOne(
            { "data.loanNo": loanNo },
            { $unset: { "data.$.requestedStatus": "" } } // Use positional operator to unset the field
        );

        // Send a success response
        return res.json({
            success: true,
            message: `Record updated successfully. Requested status has been removed.`,
        });
    }
});
