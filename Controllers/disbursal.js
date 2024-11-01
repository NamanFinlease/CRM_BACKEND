import asyncHandler from "../middleware/asyncHandler.js";
import Disbursal from "../models/Disbursal.js";

// @desc Get new disbursal
// @route GET /api/disbursal/
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
