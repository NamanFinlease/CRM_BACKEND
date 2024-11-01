import asyncHandler from "../middleware/asyncHandler.js";
import Application from "../models/Applications.js";
import Employee from "../models/Employees.js";
import Lead from "../models/Leads.js";
import { postLogs } from "./logs.js";

export const sentBack = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { sendTo, reason } = req.body;

    // If sendTo is screener this will be used
    const lead = await Lead.findById(id);

    // If sendTo is Credit Manager this will be used
    const application = await Application.findOne({ lead: id });

    if (sendTo === "creditManager") {
        application.isRecommended = false;
        application.recommendedBy = null;
        await application.save();
    }

    const employee = await Employee.findOne({
        _id: req.employee._id.toString(),
    });
    const logs = await postLogs(
        lead._id,
        `SENT BACK TO ${sendTo.toUpperCase()}`,
        `${lead.fName ?? application.lead.fName} ${
            lead.mName ?? application.lead.mName ?? ""
        } ${lead.lName ?? application.lead.lName ?? ""}`,
        `Sent back by ${employee.fName} ${employee.lName}`,
        `${reason}`
    );

    res.json({ success: true, logs });
});
