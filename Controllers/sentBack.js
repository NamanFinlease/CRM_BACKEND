import asyncHandler from "../middleware/asyncHandler.js";
import Application from "../models/Applications.js";
import Disbursal from "../models/Disbursal.js";
import Employee from "../models/Employees.js";
import Lead from "../models/Leads.js";
import { postLogs } from "./logs.js";

export const sentBack = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { sendTo, reason } = req.body;

    const lead = await Lead.findById(id);

    // If sendTo is Credit Manager this will be used
    const application = await Application.findOne({ lead: id })
        .populate("lead")
        .populate({ path: "creditManagerId", select: "fName mName lName" });
    let logs;

    if (req.activeRole === "sanctionHead") {
        application.isRecommended = false;
        application.recommendedBy = null;
        await application.save();
        logs = await postLogs(
            lead._id,
            `SENT BACK TO ${sendTo.toUpperCase()}`,
            `${application.lead.fName} ${
                application.lead.mName && ` ${application.lead.mName}`
            }${application.lead.lName ?? ` ${application.lead.lName}`}`,
            `Sent back by ${application.creditManagerId.fName} ${application.creditManagerId.lName}`,
            `${reason}`
        );
    } else if (req.activeRole === "disbursalManager") {
        // Find the disbursal application by matching it with the application and delete it
        const disbursal = await Disbursal.findByIdAndDelete({
            application: application._id.toString(),
        })
            .populate({
                path: "application",
                populate: {
                    path: "lead",
                },
            })
            .populate({
                path: "disbursalManagerId",
                select: "fName mName lName",
            });

        if (!disbursal) {
            res.status(400);
            throw new Error("Disbursal application could not be deleted");
        }

        application.isApproved = false;
        application.approvedBy = null;
        application.isRecommended = false;
        application.recommendedBy = null;
        await application.save();

        const employee = await Employee.findOne({
            _id: req.employee._id.toString(),
        });
        const logs = await postLogs(
            lead._id,
            `SENT BACK TO ${sendTo.toUpperCase()}`,
            `${application.lead.fName} ${
                application.lead.mName && ` ${application.lead.mName}`
            }${application.lead.lName ?? ` ${application.lead.lName}`}`,
            `Sent back by ${application.creditManagerId.fName} ${application.creditManagerId.lName}`,
            `${reason}`
        );

        res.json({ success: true, logs });
    } else {
        res.status(401);
        throw new Error("You are not authorized to sent back the application");
    }
});
