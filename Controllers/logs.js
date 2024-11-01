import asyncHandler from "../middleware/asyncHandler.js";
import Lead from "../models/Leads.js";
import LogHistory from "../models/LeadLogHistory.js";

// @desc Post logs with status
// @access Private
export const postLogs = async (
    leadId = "",
    leadStatus = "",
    borrower = "",
    leadRemark = "",
    reason = ""
) => {
    try {
        // Check if the lead is present
        const lead = await Lead.findOne({ _id: leadId });

        if (!lead) {
            res.status(404);
            throw new Error("No lead found!!!");
        }

        // Create the new log initally
        const createloghistory = await LogHistory.create({
            lead: leadId,
            logDate: new Date(),
            status: leadStatus,
            borrower: borrower,
            leadRemark: leadRemark,
            reason: reason,
        });
        return createloghistory;
    } catch (error) {
        throw new Error(error.message);
    }
};

// @desc Get logs with status
// @route GET /api/lead/viewlogs
// @access Private
export const viewLogs = asyncHandler(async (req, res) => {
    // Fetch the lead id
    const { leadId } = req.params;

    // Check if the lead is present
    const leadDetails = await LogHistory.find({ lead: leadId }).sort({
        logDate: -1,
    });

    if (!leadDetails) {
        res.status(404);
        throw new Error("No lead found!!!");
    }

    res.json(leadDetails);
});
