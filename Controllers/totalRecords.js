import asyncHandler from "../middleware/asyncHandler.js";
import Lead from "../models/Leads.js";
import Application from "../models/Applications.js";

// @desc Get total number of lead   
// @route GET /api/leads/totalRecords or /api/applications/totalRecords
// @access Private
export const totalRecords = asyncHandler(async (req, res) => {
    const leads = await Lead.find({});
    const applications = await Application.find({});

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
            !lead.isRecommended
    );

    let heldLeads = leads.filter(
        (lead) => lead.screenerId && lead.onHold && !lead.isRejected
    );

    let rejectedLeads = leads.filter(
        (lead) => lead.screenerId && !lead.onHold && lead.isRejected
    );

    if (req.activeRole === "screener") {
        allocatedLeads = allocatedLeads.filter(
            (allocated) =>
                allocated.screenerId.toString() === req.employee._id.toString()
        );

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
            !application.isRejected
    );

    let heldApplications = applications.filter(
        (application) =>
            application.creditManagerId &&
            application.onHold &&
            !application.isRejected
    );

    let rejectedApplications = applications.filter(
        (application) =>
            application.creditManagerId &&
            !application.onHold &&
            application.isRejected
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
    });
});

// @desc Get total number of lead
// @route GET /api/leads/totalRecordsForSupervisor 
// @access Private 
export const totalRecordsForSupervisor = asyncHandler( async (req,res)=>{
    try {
// Set the timezone offset for 'Asia/Kolkata' in minutes (+5 hours 30 minutes)
const kolkataOffset = 5 * 60 + 30; // 330 minutes

// Current date in the 'Asia/Kolkata' timezone
const now = new Date();
const kolkataNow = new Date(now.getTime() + kolkataOffset * 60 * 1000);

// Start of today in 'Asia/Kolkata' timezone
const startOfToday = new Date(kolkataNow);
startOfToday.setHours(0, 0, 0, 0); // Midnight in Kolkata time
const startOfTodayUTC = new Date(startOfToday.getTime() - kolkataOffset * 60 * 1000); // Convert to UTC

// End of today in 'Asia/Kolkata' timezone
const endOfToday = new Date(kolkataNow);
endOfToday.setHours(23, 59, 59, 999); // End of day in Kolkata time
const endOfTodayUTC = new Date(endOfToday.getTime() - kolkataOffset * 60 * 1000); // Convert to UTC

// MongoDB query using createdAt field
const leadsGeneratedToday = await Lead.countDocuments({
    createdAt: {
        $gte: startOfTodayUTC,
        $lt: endOfTodayUTC
    }
});

// MongoDB query for applications sanctioned today
const sanctionedTodayCount = await Application.countDocuments({
    createdAt: { $gte: startOfTodayUTC, $lt: endOfTodayUTC },
    status: 'sanctioned'
});

// MongoDB query for applications in process today
const inProcessTodayCount = await Application.countDocuments({
    createdAt: { $gte: startOfTodayUTC, $lt: endOfTodayUTC },
    status: 'in process'
});

console.log(`Sanctioned Today: ${sanctionedTodayCount}`);
console.log(`In Process Today: ${inProcessTodayCount}`);


// Now to find todays total lead in process 
console.log(leadsGeneratedToday)
        return res.status(200).json({
            success : true,
            message : `Lead ARE ${leadsGeneratedToday}  ${inProcessTodayCount} ${sanctionedTodayCount}` ,
            leadsGeneratedToday : leadsGeneratedToday,
            inProcessTodayCount : inProcessTodayCount,
            sanctionedTodayCount : sanctionedTodayCount 
        })
    } catch (error) {
        console.log(error.message)
        return res.status(501).json({
            success : false,
            message :`Error while fetching the supervisor ${error.message}`
        })
    }
} )
