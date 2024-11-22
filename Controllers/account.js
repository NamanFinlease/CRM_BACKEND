import asyncHandler from "../middleware/asyncHandler.js";
import Closed from "../models/Closed.js";

// @desc Get all the updated Active leads to verify
// @route GET /api/accounts/active/verify
// @access Private
export const activeLeadsToVerify = asyncHandler(async (req, res) => {
    if (req.activeRole === "accountExecutive") {
        const page = parseInt(req.query.page) || 1; // current page
        const limit = parseInt(req.query.limit) || 10; // items per page
        const skip = (page - 1) * limit;

        const pipeline = [
            {
                $match: {
                    // Match the parent document where the data array contains elements
                    // that have isActive: true
                    "data.isActive": true,
                    "data.isDisbursed": true,
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
                $skip: skip,
            },
            {
                $limit: limit,
            },
        ];

        const results = await Closed.aggregate(pipeline);
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
            totalPages: Math.ceil(totalActiveLeadsToVerify / limit),
            currentPage: page,
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
        const { status } = req.body;

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

        // const activeRecord = await Closed.findOne({
        //     "data.loanNo": loanNo,
        // });
        // if (!activeRecord) {
        //     res.status(404);
        //     throw new Error({
        //         success: false,
        //         message: "Loan number not found.",
        //     });
        // }

        // Locate the specific loan entry in the data array
        // const loanIndex = activeRecord.data.findIndex(
        //     (loan) => loan.loanNo === loanNo
        // );
        // if (loanIndex === -1) {
        //     res.status(404);
        //     throw new Error({
        //         success: false,
        //         message: "Loan entry not found in the record.",
        //     });
        // }

        // Access the loan entry from the data array
        const loanEntry = populatedRecord.data[0]; // Accessing the loan entry

        // Ensure the status selected by the account executive matches the requestedStatus
        if (loanEntry.requestedStatus !== status) {
            res.status(400);
            throw new Error(
                "Contact the Collection Executive because the status they requested is different from what you're trying to do!!"
            );
        }

        // Call the setStatusFlags method from the schema to set the flags based on the selected status
        await loanEntry.setStatusFlags(loanEntry, status);

        // Save the updated record to the database
        await populatedRecord.save();

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

        // Find the document containing the specific loanNo in the `data` array
        const activeRecord = await Closed.findOne(
            { "data.loanNo": loanNo },
            {
                pan: 1, // Include only necessary fields
                data: { $elemMatch: { loanNo: loanNo } }, // Fetch only the matched data entry
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

        // Access the loan entry from the data array
        const loanEntry = populatedRecord.data[0];

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
