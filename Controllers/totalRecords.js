import asyncHandler from "../middleware/asyncHandler.js";
import Lead from "../models/Leads.js";
import Application from "../models/Applications.js";

// @desc Get total number of lead
// @route GET /api/leads/totalRecords or /api/applications/totalRecords
// @access Private
export const totalRecords = asyncHandler(async (req, res) => {
    const leads = await Lead.find({});
    const applications = await Application.find({}).populate("lead");

    const totalLeads = leads.length;
    const newLeads = leads.filter(
        (lead) =>
            !lead.screenerId &&
            !lead.onHold &&
            !lead.isRejected &&
            !lead.isRecommended
    ).length;

    let allocatedLeads = leads.filter(
        (lead) =>
            lead.screenerId &&
            !lead.onHold &&
            !lead.isRejected &&
            !lead.isRecommended &&
            !lead.recommendedBy
    );

    let heldLeads = leads.filter(
        (lead) => lead.screenerId && lead.onHold && !lead.isRejected
    );

    let rejectedLeads = leads.filter(
        (lead) => lead.screenerId && !lead.onHold && lead.isRejected
    );

    if (req.activeRole === "screener") {
        allocatedLeads = allocatedLeads.filter((allocated) => {
            return (
                allocated.screenerId.toString() === req.employee._id.toString()
            );
        });

        heldLeads = heldLeads.filter(
            (held) => held.heldBy.toString() === req.employee._id.toString()
        );
    }

    const totalApplications = applications.length;
    const newApplications = applications.filter(
        (application) =>
            !application.creditManagerId &&
            !application.onHold &&
            !application.isRejected
    ).length;

    let allocatedApplications = applications.filter(
        (application) =>
            application.creditManagerId &&
            !application.onHold &&
            !application.isRejected &&
            !application.isRecommended
    );

    let heldApplications = applications.filter(
        (application) =>
            application.creditManagerId &&
            application.onHold &&
            !application.isRejected &&
            !application.isRecommended &&
            !application.isApproved
    );

    let rejectedApplications = applications.filter(
        (application) =>
            application.creditManagerId &&
            !application.onHold &&
            application.isRejected &&
            !application.isRecommended &&
            !application.isApproved
    );
    let sanctionedApplications = applications.filter(
        (application) =>
            application.creditManagerId &&
            !application.onHold &&
            !application.isRejected &&
            application.isApproved
    );

    if (req.activeRole === "creditManager") {
        allocatedApplications = allocatedApplications.filter(
            (application) =>
                application.creditManagerId.toString() ===
                req.employee._id.toString()
        );

        heldApplications = heldApplications.filter(
            (application) =>
                application?.creditManagerId.toString() ===
                req.employee._id.toString()
        );
    }

    let newSanctions;
    let sanctioned;
    if (req.activeRole === "sanctionHead") {
        newSanctions = applications.filter(
            (application) =>
                application.creditManagerId &&
                !application.onHold &&
                !application.isRejected &&
                application.isRecommended
        ).length;

        sanctioned = applications.filter(
            (application) =>
                application.creditManagerId &&
                !application.onHold &&
                !application.isRejected &&
                application.isRecommended &&
                application.isApproved
        ).length;
    }

    res.json({
        leads: {
            totalLeads,
            newLeads,
            allocatedLeads: allocatedLeads.length,
            heldLeads: heldLeads.length,
            rejectedLeads: rejectedLeads.length,
        },
        applications: {
            totalApplications,
            newApplications,
            allocatedApplications: allocatedApplications.length,
            heldApplications: heldApplications.length,
            rejectedApplications: rejectedApplications.length,
            sanctionedApplications: sanctionedApplications.length,
        },
        sanction: {
            newSanctions,
            sanctioned,
        },
    });
});
