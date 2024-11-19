import asyncHandler from "../middleware/asyncHandler.js";
import Application from "../models/Applications.js";
import Sanction from "../models/Sanction.js";
import Disbursal from "../models/Disbursal.js";
import Employee from "../models/Employees.js";
import Lead from "../models/Leads.js";
import { postLogs } from "./logs.js";

export const sentBack = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { sendTo, reason } = req.body;

    const lead = await Lead.findById(id);
    let application = await Application.findOne({ lead: id }).populate({
        path: "lead",
        populate: { path: "documents" },
    });
    let sanction;
    let disbursal;

    let logs;

    if (req.activeRole === "creditManager") {
        if (sendTo === "screener") {
            const deletedApplication = await Application.findOneAndDelete({
                lead: id,
            })
                .populate({ path: "lead", populate: { path: "documents" } })
                .populate({
                    path: "creditManagerId",
                    select: "fName mName lName",
                });
            if (!deletedApplication) {
                res.status(400);
                throw new Error("Can not delete!!");
            }

            lead.recommendedBy = null;
            lead.isRecommended = false;
            await lead.save();

            logs = await postLogs(
                lead._id,
                `SENT BACK TO ${sendTo.toUpperCase()}`,
                `${deletedApplication.lead.fName}${
                    deletedApplication.lead.mName &&
                    ` ${deletedApplication.lead.mName}`
                }${
                    deletedApplication.lead.lName &&
                    ` ${deletedApplication.lead.lName}`
                }`,
                `Sent back by ${deletedApplication.creditManagerId.fName} ${deletedApplication.creditManagerId.lName}`,
                `${reason}`
            );
            res.json({ success: true, logs });
        }
    } else if (req.activeRole === "sanctionHead") {
        if (sendTo === "creditManager") {
            // If sendTo is Credit Manager this will be used
            sanction = await Sanction.findOneAndDelete({
                application: application._id,
            }).populate({
                path: "application",
                populate: { path: "lead", populate: { path: "documents" } },
            });
            if (!sanction) {
                res.status(400);
                throw new Error("Can not delete!!");
            }

            application.isRecommended = false;
            application.recommendedBy = null;

            logs = await postLogs(
                lead._id,
                `SENT BACK TO ${sendTo.toUpperCase()}`,
                `${sanction.application.lead.fName}${
                    sanction.application.lead.mName &&
                    ` ${sanction.application.lead.mName}`
                }${
                    sanction.application.lead.lName &&
                    ` ${sanction.application.lead.lName}`
                }`,
                `Sent back by ${req.employee.fName} ${req.employee.lName}`,
                `${reason}`
            );

            await application.save();

            res.json({ success: true, logs });
        } else {
            res.status(400);
            throw new Error(
                `Sanction Head can not send the application directly to ${sendTo}!!`
            );
        }
    } else if (req.activeRole === "disbursalHead") {
        if (sendTo === "disbursalManager") {
            sanction = await Sanction.findOne({
                application: application._id,
            });
            disbursal = await Disbursal.findOne({
                sanction: sanction._id,
            }).populate([
                {
                    path: "sanction",
                    populate: {
                        path: "application",
                        populate: {
                            path: "lead",
                            populate: { path: "documents" },
                        },
                    },
                },
            ]);

            if (!disbursal) {
                res.status(404);
                throw new Error("No Disbursal found!!");
            }

            disbursal.isRecommended = false;
            disbursal.recommendedBy = null;

            logs = await postLogs(
                lead._id,
                `SENT BACK TO ${sendTo.toUpperCase()}`,
                `${disbursal.sanction.application.lead.fName}${
                    disbursal.sanction.application.lead.mName &&
                    ` ${disbursal.sanction.application.lead.mName}`
                }${
                    disbursal.sanction.application.lead.lName &&
                    ` ${disbursal.sanction.application.lead.lName}`
                }`,
                `Sent back by ${req.employee.fName} ${req.employee.lName}`,
                `${reason}`
            );

            await disbursal.save();

            res.json({ success: true, logs });
        }
    } else {
        res.status(401);
        throw new Error("You are not authorized to sent back the application");
    }
});
