import asyncHandler from "../middleware/asyncHandler.js";
import Lead from "../models/Leads.js";
import Application from "../models/Applications.js";
import Disbursal from "../models/Disbursal.js";

// @desc Get total number of lead
// @route GET /api/leads/totalRecords or /api/applications/totalRecords
// @access Private
export const totalRecords = asyncHandler(async (req, res) => {
    const leads = await Lead.find({});
    const applications = await Application.find({}).populate("lead");
    const disbursals = await Disbursal.find({});

    // Screener
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

    // Credit Manager
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

    // Sanction Head
    let newSanctions = applications.filter(
        (application) =>
            application.creditManagerId &&
            !application.onHold &&
            !application.isRejected &&
            application.isRecommended
    ).length;

    let sanctioned = applications.filter(
        (application) =>
            application.creditManagerId &&
            !application.onHold &&
            !application.isRejected &&
            application.isRecommended &&
            application.isApproved
    ).length;

    // Disbursal Manager
    const totalDisbursals = disbursals.length;
    const newDisbursals = disbursals.filter(
        (disbursalApplication) =>
            !disbursalApplication.disbursalManagerId &&
            !disbursalApplication.isRecommended
    ).length;

    let allocatedDisbursals = disbursals.filter(
        (disbursalApplication) =>
            disbursalApplication.disbursalManagerId &&
            !disbursalApplication.isRecommended &&
            !disbursalApplication.isApproved
    );
    if (req.activeRole === "disbursalManager") {
        allocatedDisbursals = allocatedDisbursals.filter(
            (disbursalApplication) =>
                disbursalApplication.disbursalManagerId.toString() ===
                req.employee._id.toString()
        );
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
        disbursal: {
            totalDisbursals,
            newDisbursals,
            allocatedDisbursals: allocatedDisbursals.length,
        },
    });
});
