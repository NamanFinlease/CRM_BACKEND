import asyncHandler from "../middleware/asyncHandler.js";
import Documents from "../models/Documents.js";
import Employee from "../models/Employees.js";
import Lead from "../models/Leads.js";
import { BSA } from "../utils/BSA.js";
import { postLogs } from "./logs.js";
import { uploadDocs, getDocs } from "../utils/docsUploadAndFetch.js";
import FormData from "form-data";

// @desc Adding file documents to a lead
// @route PATCH /api/leads/docs/:id or /api/applications/docs/:id
// @access Private
export const addDocs = asyncHandler(async (req, res) => {
    const { id } = req.params;
    let employeeId;
    const { remarks } = req.body;
    console.log(remarks);

    let lead = await Lead.findById(id);
    if (!lead) {
        throw new Error("Lead not found");
    }

    const docs = await Documents.findOne({ pan: lead.pan });

    if (req.activeRole === "screener" || req.activeRole === "creditManager") {
        employeeId = req.employee._id.toString();
    }

    if (!req.files) {
        res.status(400);
        throw new Error("No files uploaded");
    }

    if (req.activeRole === "screener" || req.activeRole === "creditManager") {
        // Validate Aadhaar document uploads, but only if they exist
        const aadhaarFrontUploaded =
            req.files.aadhaarFront && req.files.aadhaarFront.length > 0;
        const aadhaarBackUploaded =
            req.files.aadhaarBack && req.files.aadhaarBack.length > 0;
        const eAadhaarUploaded =
            req.files.eAadhaar && req.files.eAadhaar.length > 0;

        // Validation logic: Aadhaar files must follow either/or rule if uploaded
        if ((aadhaarFrontUploaded || aadhaarBackUploaded) && eAadhaarUploaded) {
            return res.status(400).json({
                message:
                    "You cannot upload both aadhaar documents and eAadhaar.",
            });
        }

        // if (req.files?.bankStatement) {
        //     const buffers = []; // Array to store file buffers
        //     const filenames = []; // Array to store file names

        //     // Extract buffers and filenames
        //     req.files.bankStatement.forEach((file) => {
        //         buffers.push(file.buffer);
        //         filenames.push(file.originalname);
        //     });

        //     // Prepare the 'data' object dynamically
        //     const data = { filePassword: {} };

        //     // Check if remarks is a string or an array
        //     if (typeof remarks === "string") {
        //         console.log("It's coming here");

        //         // If remarks is a single string, assign it to all files
        //         filenames.forEach((fileName) => {
        //             data.filePassword[fileName] = remarks; // Use the same remark for all files
        //         });
        //         console.log(data);
        //     } else if (Array.isArray(remarks)) {
        //         // If remarks is an array, ensure the length matches the number of files
        //         if (remarks.length !== filenames.length) {
        //             res.status(400);
        //             throw new Error(
        //                 "The number of remarks must match the number of uploaded files."
        //             );
        //         }

        //         // Assign each remark to the corresponding file
        //         filenames.forEach((fileName, index) => {
        //             data.filePassword[fileName] = remarks[index]; // Use the corresponding remark
        //         });
        //     } else {
        //         res.status(400);
        //         throw new Error("Remarks must be a string or an array.");
        //     }

        //     // Prepare FormData
        //     const formData = new FormData();
        //     buffers.forEach((buffer, index) => {
        //         const fileName = filenames[index];
        //         formData.append("file", buffer, fileName); // Add file to FormData
        //     });

        //     // Add the 'data' field as JSON to FormData
        //     formData.append("data", JSON.stringify(data));

        //     const response = await BSA(formData);

        //     if (!response.success) {
        //         res.status(400);
        //         throw new Error(response.message);
        //     }
        // }

        // If only aadhaarFront and aadhaarBack are provided, or only eAadhaar or none, proceed
        if (
            aadhaarFrontUploaded ||
            (aadhaarBackUploaded && !eAadhaarUploaded) ||
            (eAadhaarUploaded &&
                !aadhaarFrontUploaded &&
                !aadhaarBackUploaded) ||
            (!aadhaarFrontUploaded && !aadhaarBackUploaded && !eAadhaarUploaded)
        ) {
            // Proceed with document upload
            const result = await uploadDocs(docs, req.files, remarks);
            if (!result) {
                res.status(400);
                throw new Error("Couldn't store documents.");
            }
        } else {
            return res.status(400).json({
                message:
                    "At least one of the Aadhaar documents or eAadhaar must be uploaded, or none.",
            });
        }
    } else {
        res.status(401);
        throw new Error("You can't upload documents.");
    }

    const employee = await Employee.findOne({ _id: employeeId });
    const logs = await postLogs(
        lead._id,
        "ADDED DOCUMENTS",
        `${lead.fName}${lead.mName && ` ${lead.mName}`}${
            lead.lName && ` ${lead.lName}`
        }`,
        `Added documents by ${employee.fName} ${employee.lName}`
    );

    res.json({ message: "file uploaded successfully", logs });
});

// @desc Get the docs from a lead/application
// @route GET /api/leads/docs/:id or /api/applications/docs/:id
// @access Private
export const getDocuments = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { docType } = req.query;
    const docId = req.query.docId;

    let lead = await Lead.findById(id);
    console.log(lead);

    if (!lead) {
        res.status(404);
        throw new Error("Lead not found!!!");
    }
    const docs = await Documents.findOne({ pan: lead.pan });
    console.log(docs);

    const result = await getDocs(docs, docType, docId);

    // Return the pre-signed URL for this specific document
    res.json({
        type: docType,
        url: result.preSignedUrl,
        mimeType: result.mimeType,
    });
});
