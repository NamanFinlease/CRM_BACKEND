import asyncHandler from "../middleware/asyncHandler.js";
import Lead from "../models/Leads.js";
import Application from "../models/Applications.js";

// @desc Internal Dedupe (Old history)
// @route GET /api/leads/old-history/:id
// @access Private
const internalDedupe = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lead = await Lead.findById(id).sort({ createdAt: -1 });

    if (!lead) {
        res.status(404);
        throw new Error("No previous leads found!!");
    }

    const { aadhaar, pan } = lead;

    // Now find all other leads with the same aadhaar or pan
    const relatedLeads = await Lead.find({
        _id: { $ne: id }, // Exclude the original lead
        $and: [{ aadhaar: aadhaar }, { pan: pan }, { isRecommended: false }],
    });

    // const relatedApplications = await Application.find({
    //     "lead": { $ne: id }, // Exclude the original lead
    //     $or: [{ "lead.aadhaar": aadhaar }, { "lead.pan": pan }],
    // });

    const relatedApplications = await Application.aggregate([
        {
            $lookup: {
                from: "leads",
                localField: "lead",
                foreignField: "_id",
                as: "leadDetails",
            },
        },
        {
            $unwind: "$leadDetails",
        },
        {
            $match: {
                lead: { $ne: id },
                $and: [
                    { "leadDetails.aadhaar": aadhaar },
                    { "leadDetails.pan": pan },
                ],
            },
        },
        // {
        //     $project: {
        //         _id: 1,
        //         lead: 1,
        //         leadDetails: 1

        //     }
        // }
    ]);


    return res.json({
        relatedLeads,
        relatedApplications,
    });
});

export default internalDedupe;
