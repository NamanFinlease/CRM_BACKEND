import { Readable } from "stream";
import csvParser from "csv-parser";
import asyncHandler from "../middleware/asyncHandler.js";
import Lead from "../models/Leads.js";
import { postLogs } from "./logs.js";
import LogHistory from "../models/LeadLogHistory.js";

export const bulkUpload = asyncHandler(async (req, res) => {
    const readableFile = new Readable();
    readableFile._read = () => {};
    readableFile.push(req.file.buffer);
    readableFile.push(null);

    const results = [];
    const BATCH_SIZE = 1000;
    let insertedCount = 0;

    readableFile
        .pipe(csvParser())
        .on("data", async (data) => {
            const {
                fName,
                mName,
                lName,
                gender,
                dob,
                aadhaar,
                pan,
                mobile,
                alternateMobile,
                personalEmail,
                officeEmail,
                loanAmount,
                salary,
                pinCode,
                state,
                city,
            } = data;

            const newLead = {
                fName,
                mName: mName ?? "",
                lName: lName ?? "",
                gender,
                dob: new Date(dob),
                aadhaar,
                pan,
                mobile: String(mobile),
                alternateMobile: String(alternateMobile),
                personalEmail,
                officeEmail,
                loanAmount,
                salary,
                pinCode,
                state,
                city,
                source: "bulk",
            };

            results.push(newLead);

            if (results.length === BATCH_SIZE) {
                readableFile.pause();
                await insertBatch(results);
                insertedCount += results.length;
                results.length = 0;
                readableFile.resume();
            }
        })
        .on("end", async () => {
            if (results.length > 0) {
                await insertBatch(results);
                insertedCount += results.length;

                res.json({
                    message: `Data added successfully. ${insertedCount} leads inserted.`,
                });
            }
        });
});

async function insertBatch(leadsBatch) {
    const logResults = [];

    for (const leadData of leadsBatch) {
        try {
            const newLead = await Lead.create(leadData);

            const leadLog = {
                lead: newLead._id,
                logDate: new Date(),
                status: "NEW LEAD",
                borrower: `${newLead.fName}${
                    newLead.mName && ` ${newLead.mName}`
                }${newLead.lName && ` ${newLead.lName}`}`,

                leadRemark: "New lead created via bulk upload",
            };

            logResults.push(leadLog);
        } catch (error) {
            throw new Error("Bulk upload Issue", error.message);
        }
    }

    if (logResults.length > 0) {
        try {
            await LogHistory.insertMany(logResults);
        } catch (error) {
            throw new Error("Bulk upload log Issue", error.message);
        }
    }
}
