import asyncHandler from "../middleware/asyncHandler.js";
import Closed from "../models/Closed.js";
import { createActiveLead } from "./collection.js";
import { dateFormatter } from "../utils/dateFormatter.js";
import Disbursal from "../models/Disbursal.js";
import { generateSanctionLetter } from "../utils/sendsanction.js";
import { getSanctionData } from "../utils/sanctionData.js";
import mongoose from "mongoose";
import { postLogs } from "./logs.js";

import Lead from "../models/Leads.js";
import Sanction from "../models/Sanction.js";

// @desc Get the forwarded applications
// @route GET /api/sanction/recommended
// @access Private
export const getPendingSanctions = asyncHandler(async (req, res) => {
    if (req.activeRole === "sanctionHead") {
        const page = parseInt(req.query.page) || 1; // current page
        const limit = parseInt(req.query.limit) || 10; // items per page
        const skip = (page - 1) * limit;

        const query = {
            isRejected: { $ne: true },
            isApproved: { $ne: true },
        };

        const sanctions = await Sanction.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ updatedAt: -1 })
            .populate({
                path: "application",
                populate: [
                    { path: "lead", populate: { path: "documents" } },
                    { path: "recommendedBy", select: "fName mName lName" },
                ],
            });

        const totalSanctions = await Sanction.countDocuments(query);

        return res.json({
            totalSanctions,
            totalPages: Math.ceil(totalSanctions / limit),
            currentPage: page,
            sanctions,
        });
    }
});

// @desc Get the forwarded applications
// @route GET /api/sanction/recommended
// @access Private
export const recommendedApplications = asyncHandler(async (req, res) => {
    if (req.activeRole === "creditManager") {
        const page = parseInt(req.query.page) || 1; // current page
        const limit = parseInt(req.query.limit) || 10; // items per page
        const skip = (page - 1) * limit;

        const query = {
            recommendedBy: req.employee._id.toString(),
            isRejected: { $ne: true },
            onHold: { $ne: true },
            eSigned: { $ne: true },
        };

        const recommended = await Sanction.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ updatedAt: -1 })
            .populate({
                path: "application",
                populate: [
                    { path: "lead", populate: { path: "documents" } },
                    // { path: "recommendedBy", select: "fName mName lName" },
                ],
            });

        const totalRecommended = await Sanction.countDocuments(query);

        return res.json({
            totalRecommended,
            totalPages: Math.ceil(totalRecommended / limit),
            currentPage: page,
            recommended,
        });
    }

    if (req.activeRole === "sanctionHead" || activeRole === "admin") {
        const page = parseInt(req.query.page) || 1; // current page
        const limit = parseInt(req.query.limit) || 10; // items per page
        const skip = (page - 1) * limit;

        const query = {
            isRejected: { $ne: true },
            onHold: { $ne: true },
            isDisbursed: { $ne: true },
        };

        const recommended = await Sanction.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ updatedAt: -1 })
            .populate({
                path: "application",
                populate: [
                    { path: "lead", populate: { path: "documents" } },
                    { path: "recommendedBy", select: "fName mName lName" },
                ],
            });

        const totalRecommended = await Sanction.countDocuments(query);

        return res.json({
            totalRecommended,
            totalPages: Math.ceil(totalRecommended / limit),
            currentPage: page,
            recommended,
        });
    }
});

// @desc Get sanction
// @route GET /api/sanction/:id
// @access Private
export const getSanction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const sanction = await Sanction.findOne({ _id: id }).populate({
        path: "application",
        populate: [
            { path: "lead", populate: { path: "documents" } },
            { path: "recommendedBy", select: "fName mName lName" },
        ],
    });
    if (!sanction) {
        res.status(404);
        throw new Error("Application not found!!!!");
    }
    return res.json(sanction);
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
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { id } = req.params;

            const { sanction, camDetails, response } = await getSanctionData(
                id
            );

            const lead = await Lead.findById({
                _id: sanction.application.lead,
            });

            // const pipeline = [
            //     {
            //         $match: {
            //             // Match the parent document where this pan exists
            //             pan: sanction.application.applicant.personalDetails.pan,
            //         },
            //     },
            //     {
            //         $project: {
            //             pan: 1,
            //             data: {
            //                 $arrayElemAt: [
            //                     {
            //                         $filter: {
            //                             input: "$data",
            //                             as: "item", // Alias for each element in the array
            //                             cond: {
            //                                 $and: [
            //                                     {
            //                                         $eq: [
            //                                             "$$item.isActive",
            //                                             true,
            //                                         ],
            //                                     }, // Condition for isActive
            //                                 ],
            //                             },
            //                         },
            //                     },
            //                     0,
            //                 ],
            //             },
            //         },
            //     },
            // ];
            // const activeLead = await Closed.aggregate(pipeline);
            const activeLead = await Closed.findOne(
                {
                    pan: sanction.application.applicant.personalDetails.pan,
                    data: {
                        $elemMatch: {
                            isActive: true,
                        },
                    },
                },
                {
                    pan: 1,
                    data: {
                        $elemMatch: {
                            isActive: true,
                        },
                    },
                }
            );

            if (activeLead) {
                res.status(403);
                throw new Error("This PAN already has an active lead!!");
            }

            // Generate the loanNo
            const lastSanctioned = await Sanction.aggregate([
                { $match: { loanNo: { $exists: true, $ne: null } } },
                {
                    $project: {
                        numericLoanNo: {
                            $toInt: { $substr: ["$loanNo", 6, -1] }, // Extract numeric part
                        },
                    },
                },
                { $sort: { numericLoanNo: -1 } },
                { $limit: 1 },
            ]);

            const lastSequence =
                lastSanctioned.length > 0 ? lastSanctioned[0].numericLoanNo : 0;
            const newSequence = lastSequence + 1;

            const newLoanNo = `NMFSPE${String(newSequence).padStart(11, "0")}`;

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
                `${sanction.application.applicant.personalDetails.personalEmail}`
            );

            // Return a unsuccessful response
            if (!emailResponse.success) {
                return res.json({ success: false });
            }

            const update = await Sanction.findByIdAndUpdate(
                id,
                {
                    loanNo: newLoanNo,
                    sanctionDate: response.sanctionDate,
                    isApproved: true,
                    approvedBy: req.employee._id.toString(),
                },
                { new: true }
            );

            if (!update) {
                res.status(400);
                throw new Error("There was some problem with update!!");
            }

            const newDisbursal = new Disbursal({
                sanction: sanction._id,
                loanNo: update.loanNo,
            });

            const disbursalRes = await newDisbursal.save();

            if (!disbursalRes) {
                res.status(400);
                throw new Error("Could not approve this application!!");
            }

            const newActiveLead = await createActiveLead(
                sanction.application.applicant.personalDetails.pan,
                update.loanNo,
                disbursalRes._id
            );
            if (!newActiveLead.success) {
                res.status(400);
                throw new Error(
                    "Could not create an active lead for this record!!"
                );
            }

            const logs = await postLogs(
                sanction.application.lead,
                "SANCTION APPROVED. SEND TO DISBURSAL",
                `${sanction.application.applicant.personalDetails.fName}${
                    sanction.application.applicant.personalDetails.mName &&
                    ` ${sanction.application.applicant.personalDetails.mName}`
                }${
                    sanction.application.applicant.personalDetails.lName &&
                    ` ${sanction.application.applicant.personalDetails.lName}`
                }`,
                `Sanction approved by ${req.employee.fName} ${req.employee.lName}`
            );
            await session.commitTransaction();
            session.endSession();

            return res.json({ success: true, logs });
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            res.status(500);
            throw new Error(error.message);
        }
    } else {
        res.status(401);
        throw new Error("You are not authorized!!");
    }
});

// @desc Get all sanctioned applications
// @route GET /api/sanction/approved
// @access Private
export const sanctioned = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1; // current page
    const limit = parseInt(req.query.limit) || 10; // items per page
    const skip = (page - 1) * limit;
    let query;
    if (req.activeRole === "creditManager") {
        query = {
            creditManagerId: req.employee._id.toString(),
            eSigned: { $ne: true },
        };
    } else if (req.activeRole === "sanctionHead") {
        query = {
            // eSigned: { $eq: true },
            isApproved: { $eq: true },
            isDisbursed: { $ne: true },
        };
    }
    const sanction = await Sanction.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ updatedAt: -1 })
        .populate({
            path: "application",
            populate: [
                { path: "lead", populate: { path: "documents" } },
                { path: "recommendedBy", select: "fName mName lName" },
            ],
        });

    const totalSanctions = await Sanction.countDocuments(query);

    return res.json({
        totalSanctions,
        totalPages: Math.ceil(totalSanctions / limit),
        currentPage: page,
        sanction,
    });
});
