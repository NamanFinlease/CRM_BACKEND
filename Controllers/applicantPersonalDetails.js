import asyncHandler from "../middleware/asyncHandler.js";
import Applicant from "../models/Applicant.js";
import Application from "../models/Applications.js";
import Bank from "../models/ApplicantBankDetails.js";
import Employee from "../models/Employees.js";
import Lead from "../models/Leads.js";
import { postLogs } from "./logs.js";
import { verifyBank } from "../utils/verifyBank.js";

// @desc Post applicant details
// @access Private
export const applicantDetails = async (details = null) => {
    try {
        const applicant = await Applicant.findOne({
            $and: [
                { "personalDetails.personalEmail": details.personalEmail },
                { "personalDetails.mobile": details.mobile }, // Check if Aadhaar matches
                { "personalDetails.pan": details.pan }, // Check if PAN matches
                { "personalDetails.aadhaar": details.aadhaar }, // Check if Aadhaar matches
            ],
        });

        if (applicant) {
            return applicant;
        }
        // Create the new log initally
        const newApplicant = await Applicant.create({
            personalDetails: {
                fName: details.fName,
                mName: details.mName,
                lName: details.lName,
                gender: details.gender,
                dob: details.dob,
                mobile: details.mobile,
                alternateMobile: details.alternateMobile,
                personalEmail: details.personalEmail,
                officeEmail: details.officeEmail,
                screenedBy: details.screenedBy,
                pan: details.pan,
                aadhaar: details.aadhaar,
            },
        });
        return newApplicant;
    } catch (error) {
        throw new Error(error.message);
    }
};

// @desc Bank Verify and add the back.
// @route POST /api/verify/bank
// @access Private
export const bankVerification = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        beneficiaryName,
        bankAccNo,
        accountType,
        ifscCode,
        bankName,
        branchName,
    } = req.body;

    const applicant = await Applicant.findById(id);

    if (!applicant) {
        res.status(404);
        throw new Error("No applicant found!!!");
    }

    const response = await verifyBank(
        beneficiaryName,
        bankAccNo,
        accountType,
        ifscCode,
        bankName,
        branchName,
        applicant
    );

    if (!response.success) {
        res.status(400);
        throw new Error(response.message);
    }
    res.json({ success: response.success, message: response.message });
});

// @desc Update applicant details
// @route PATCH /api/applicant/:id
// @access Private
export const updateApplicantDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Check if the application is present
    const application = await Application.findOne({ _id: id }).populate("lead");

    // Check if credit Manager matches the one in the application document
    if (
        application.creditManagerId.toString() !== req.employee._id.toString()
    ) {
        res.status(403);
        throw new Error("Unauthorized: You can not update this application!!");
    }

    // Find the current applicant
    const applicant = await Applicant.findOne({ _id: application.applicant });

    if (!applicant) {
        res.status(404);
        throw new Error("Applicant not found!");
    }

    // Update residence if provided
    if (updates.residence) {
        applicant.residence = {
            ...applicant.residence, // Retain existing data
            ...updates.residence, // Merge with new data
        };
    }

    // Update employment if provided
    if (updates.employment) {
        applicant.employment = {
            ...applicant.employment, // Retain existing data
            ...updates.employment, // Merge with new data
        };
    }

    // Fetch all applicants and leads
    const allApplicants = await Applicant.find({});
    const allLeads = await Lead.find({});

    let refCheck = [];
    // Update reference if provided
    if (updates.reference && updates.reference.length > 0) {
        updates.reference.forEach((newRef) => {
            // Find all applicants who have used the same reference (mobile number)
            const applicantsWithSameReference = allApplicants.filter(
                (applicants) =>
                    applicants.reference.some(
                        (oldRef) => oldRef.mobile === newRef.mobile
                    )
            );
            if (applicantsWithSameReference.length > 0) {
                // Add all applicants who used the same reference to refCheck
                applicantsWithSameReference.forEach((applicants) => {
                    refCheck.push({
                        type: "Applicant",
                        applicant: `${applicants.personalDetails.fName}${
                            applicants.personalDetails.mName ??
                            ` ${applicants.personalDetails.mName} ${applicants.personalDetails.lName}`
                        }`,
                        mobile: `${applicants.personalDetails.mobile}`,
                        companyName: `${applicants.employment.companyName}`,
                    });
                });
            }

            // Check if the reference mobile was ever a lead
            const leadWithSameMobile = allLeads.filter(
                (lead) =>
                    lead.mobile === newRef.mobile ||
                    lead.alternateMobile === newRef.mobile
            );

            if (leadWithSameMobile.length > 0) {
                // Add all leads with the same mobile to refCheck
                leadWithSameMobile.forEach((lead) => {
                    refCheck.push({
                        type: "Lead",
                        leadId: lead._id,
                        name: `${lead.fName}${lead.mName && ` ${lead.mName}`} ${
                            lead.lName
                        }`,
                        email: lead.personalEmail,
                        officeEmail: lead.officeEmail,
                        mobile: lead.mobile,
                        alternateMobile: lead.alternateMobile,
                    });
                });
            }
            applicant.reference.push(newRef);
        });
    }

    // Save the updated applicant
    await applicant.save();

    const employee = await Employee.findOne({
        _id: req.employee._id.toString(),
    });
    const logs = await postLogs(
        application.lead._id,
        "APPLICANT PERSONAL DETAILS UPDATED",
        `${application.lead.fName} ${application.lead.mName ?? ""} ${
            application.lead.lName
        }`,
        `Applicant personal details updated by ${employee.fName} ${employee.lName}`
    );

    // Send the updated personal details as a JSON response
    return res.json({ refCheck, logs });
});

// @desc Update Applicant Bank Details
// @route PATCH /api/applicant/bankDetails/:id
// @access Private
export const updateApplicantBankDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const {
        beneficiaryName,
        bankAccNo,
        accountType,
        ifscCode,
        bankName,
        branchName,
    } = req.body;

    const applicant = await Applicant.findById(id);

    if (!applicant) {
        res.status(404);
        throw new Error("No applicant found!!!");
    }

    // Check if there's already existing bank details for this applicant
    let bankDetails = await Bank.findOne({ borrowerId: id });

    if (bankDetails) {
        // Update existing bank details
        bankDetails.beneficiaryName =
            beneficiaryName || bankDetails.beneficiaryName;
        bankDetails.bankAccNo = bankAccNo || bankDetails.bankAccNo;
        bankDetails.accountType = accountType || bankDetails.accountType;
        bankDetails.ifscCode = ifscCode || bankDetails.ifscCode;
        bankDetails.bankName = bankName || bankDetails.bankName;
        bankDetails.branchName = branchName || bankDetails.branchName;

        await bankDetails.save();
        return res.json({ bankDetails });
    }

    res.status(400);
    throw new Error("Unable to add or update bank details");
});

// @desc Get applicant Bank Details
// @route GET /api/applicant/bankDetails/:id
// @access Private
export const getApplicantBankDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const bank = await Bank.findOne({ borrowerId: id });

    if (!bank) {
        return res.json({ message: "No bank found!!" });
    }
    res.json(bank);
});

// @desc Get Applicant Personal details
// @route GET /api/applicant/:id
// @access Private
export const getApplicantDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const applicant = await Applicant.findById(id);
    if (!applicant) {
        res.status(404);
        throw new Error("No applicant found!!");
    }

    res.json(applicant);
});
