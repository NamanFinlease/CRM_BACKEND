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
        (disbursal) =>
            !disbursal.disbursalManagerId &&
            !disbursal.isRecommended
    ).length;

    let allocatedDisbursals = disbursals.filter(
        (disbursal) =>
            disbursal.disbursalManagerId &&
            !disbursal.isRecommended &&
            !disbursal.onHold &&
            !disbursal.isRejected &&
            !disbursal.isDisbursed
    );
    let pendingDisbursals = disbursals.filter(
        (disbursal) =>
            disbursal.disbursalManagerId &&
            disbursal.isRecommended &&
            !disbursal.onHold &&
            !disbursal.isRejected &&
            !disbursal.isDisbursed
    ).length;
    let disbursed = disbursals.filter(
        (disbursal) =>
            disbursal.disbursalManagerId &&
            disbursal.isRecommended &&
            disbursal.isDisbursed &&
            !disbursal.onHold &&
            !disbursal.isRejected 
    ).length;
    if (req.activeRole === "disbursalManager") {
        allocatedDisbursals = allocatedDisbursals.filter(
            (disbursal) =>
                disbursal.disbursalManagerId.toString() ===
                req.employee._id.toString()
        ).length;
        return res.json({
            disbursal: {
                newDisbursals,
                allocatedDisbursals
            },
        });
    }
    if (req.activeRole === "disbursalHead") {
        return res.json({
          
            disbursal: {
                newDisbursals,
                allocatedDisbursals: allocatedDisbursals.length,
                pendingDisbursals,
                disbursed
            },
        });
        
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

// @desc Get total number of lead
// @route GET /api/leads/totalRecordsForSupervisor
// @access Private
export const totalRecordsForSupervisor = asyncHandler(async (req, res) => {
    // Set the timezone offset for 'Asia/Kolkata' in minutes (+5 hours 30 minutes)
    const kolkataOffset = 5 * 60 + 30; // 330 minutes

    // Current date in the 'Asia/Kolkata' timezone
    const now = new Date();
    const kolkataNow = new Date(now.getTime() + kolkataOffset * 60 * 1000);

    // Start of today in 'Asia/Kolkata' timezone
    const startOfToday = new Date(kolkataNow);
    startOfToday.setHours(0, 0, 0, 0); // Midnight in Kolkata time
    const startOfTodayUTC = new Date(
        startOfToday.getTime() - kolkataOffset * 60 * 1000
    ); // Convert to UTC

    // End of today in 'Asia/Kolkata' timezone
    const endOfToday = new Date(kolkataNow);
    endOfToday.setHours(23, 59, 59, 999); // End of day in Kolkata time
    const endOfTodayUTC = new Date(
        endOfToday.getTime() - kolkataOffset * 60 * 1000
    ); // Convert to UTC

    // MongoDB query using createdAt field
    const leadsGeneratedToday = await Lead.countDocuments({
        createdAt: {
            $gte: startOfTodayUTC,
            $lt: endOfTodayUTC,
        },
    });

    // MongoDB query for applications sanctioned today
    const sanctionedTodayCount = await Application.countDocuments({
        createdAt: { $gte: startOfTodayUTC, $lt: endOfTodayUTC },
        status: "sanctioned",
    });

    // MongoDB query for applications in process today
    const inProcessTodayCount = await Application.countDocuments({
        createdAt: { $gte: startOfTodayUTC, $lt: endOfTodayUTC },
        status: "in process",
    });


    // Now to find todays total lead in process
    return res.status(200).json({
        success: true,
        message: `Lead ARE ${leadsGeneratedToday}  ${inProcessTodayCount} ${sanctionedTodayCount}`,
        leadsGeneratedToday: leadsGeneratedToday,
        inProcessTodayCount: inProcessTodayCount,
        sanctionedTodayCount: sanctionedTodayCount,
    });
});
