import mongoose from "mongoose";
import "dotenv/config.js";
import Application from "../models/Applications.js";
import Closed from "../models/Closed.js";
import Disbursal from "../models/Disbursal.js";
import Lead from "../models/Leads.js";
import Documents from "../models/Documents.js";
import Sanction from "../models/Sanction.js";
import Employee from "../models/Employees.js";
import xlsx from "xlsx";

const mongoURI = process.env.MONGO_URI;

// MongoDB Connection
async function connectToDatabase() {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to the database!");
    } catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1); // Exit the process on failure
    }
}

// Function to migrate recommended applications to sanction collection.
const migrateApplicationsToSanctions = async () => {
    try {
        const applications = await Application.find({ isRecommended: true });

        for (const application of applications) {
            const existingSanction = await Sanction.findOne({
                application: application._id,
            });

            if (!existingSanction) {
                const newSanctionData = {
                    application: application._id,
                    recommendedBy: application.recommendedBy,
                    isChanged: true,
                };

                // Populate sanction data based on application conditions
                if (application.isApproved) {
                    newSanctionData.isApproved = true;
                    newSanctionData.approvedBy = application.approvedBy; // Assuming recommendedBy holds approval info
                    newSanctionData.sanctionDate = application.sanctionDate;
                    // console.log("New Sanction: ", newSanctionData);
                }

                // Create the new Sanction document
                const newSanction = new Sanction(newSanctionData);
                await newSanction.save();
                // console.log(newSanction);

                console.log(
                    `Created sanction for application ID: ${application._id}`
                );
            } else {
                console.log(
                    `Sanction already exists for application ID: ${application._id}`
                );
            }
        }

        console.log("Migration completed");
    } catch (error) {
        console.error("Error during migration:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
};

// Function to replace application field to sanction field in Disbursal records.
const updateDisbursals = async () => {
    try {
        // Find all disbursals that have an `application` field instead of `sanction`
        const disbursalsWithApplication = await Disbursal.find({
            application: { $exists: true },
        });
        console.log(disbursalsWithApplication);

        for (const disbursal of disbursalsWithApplication) {
            const applicationId = disbursal.application;
            console.log(applicationId);

            // Find the corresponding Sanction document by application ID
            const sanction = await Sanction.findOne({
                application: applicationId,
            });

            if (sanction) {
                // Update disbursal with the found sanction ID and remove the application field
                disbursal.sanction = sanction._id;
                disbursal.application = undefined; // Remove the application field

                // Save the updated disbursal document
                await disbursal.save();
                console.log(
                    `Updated disbursal with ID: ${disbursal._id}, replaced application with sanction ID.`
                );
            } else {
                console.log(
                    `No sanction found for application ID: ${applicationId}. Disbursal ID: ${disbursal._id} remains unchanged.`
                );
            }
        }

        console.log("Migration completed.");
    } catch (error) {
        console.error("Error during migration:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
};

// Function to add recommendedBy to sanction records.
const addRecommendedByToSanctions = async () => {
    try {
        // Fetch all sanctions that might be missing recommendedBy
        const sanctions = await Sanction.find({
            recommendedBy: { $exists: false },
        });

        for (const sanction of sanctions) {
            // Find the corresponding Application document
            const application = await Application.findById(
                sanction.application
            );

            if (application) {
                // Update the Sanction document with the recommendedBy field from Application
                sanction.recommendedBy = application.recommendedBy;

                // Save the updated sanction document
                await sanction.save();
                console.log(
                    `Updated sanction for application ID: ${application._id} with recommendedBy: ${application.recommendedBy}`
                );
            } else {
                console.log(
                    `No corresponding application found for sanction ID: ${sanction._id}`
                );
            }
        }

        console.log("Field update completed");
    } catch (error) {
        console.error("Error during field update:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
};

const matchPANFromExcel = async () => {
    try {
        // Load the Excel file
        const workbook = xlsx.readFile("Speedoloan disbursal.xlsx"); // replace with your file path
        const sheetName = workbook.SheetNames[0]; // assuming data is in the first sheet
        const sheet = workbook.Sheets[sheetName];

        const range = xlsx.utils.decode_range(sheet["!ref"]);

        // Extract PAN numbers from column B, starting at row 2
        const panNumbers = [];

        for (let row = 1; row <= range.e.r; row++) {
            // row 1 corresponds to B2
            const cellAddress = `B${row + 1}`;
            const cell = sheet[cellAddress];
            if (cell && cell.v) {
                const cleanedPanNumber = cell.v.replace(/\s+/g, "");
                // Check if the cell exists and has a value
                panNumbers.push(cleanedPanNumber);
            }
        }

        let leadCount = 0;
        let applicationCount = 0;
        let sanctionCount = 0;

        let leads = [];
        let applications = [];
        let sanctions = [];

        for (const panNumber of panNumbers) {
            // Check if PAN exists in the Lead collection
            const lead = await Lead.findOne({
                pan: String(panNumber),
            }).populate({ path: "recommendedBy", select: "fName mName lName" });

            if (lead) {
                const application = await Application.findOne({
                    lead: lead._id,
                }).populate([
                    { path: "lead" },
                    { path: "recommendedBy", select: "fName mName lName" },
                ]);

                if (application) {
                    const sanction = await Sanction.findOne({
                        application: application._id,
                    }).populate([
                        { path: "application", populate: { path: "lead" } },
                        { path: "recommendedBy", select: "fName mName lName" },
                    ]);

                    if (sanction) {
                        sanctionCount += 1;
                        sanctions.push(
                            `${sanction.application.lead.pan} in Sanction`
                        );
                    } else {
                        applicationCount += 1;
                        applications.push(
                            `${application.lead.pan} in Application`
                        );
                        // console.log(
                        //     `No sanction found for application ${application._id}`
                        // );
                    }
                } else {
                    leadCount += 1;
                    leads.push(`${lead.pan} in Lead`);
                }
            } else {
                console.log(`No lead found for PAN ${panNumber}`);
            }
        }
        // Prepare data for Excel with leads in column A, applications in column B, and sanctions in column C
        const maxLength = Math.max(
            leads.length,
            applications.length,
            sanctions.length
        );
        const data = [
            ["Lead", "Application", "Sanction"], // Header row
            ...Array.from({ length: maxLength }, (_, i) => [
                leads[i] || "", // Column A
                applications[i] || "", // Column B
                sanctions[i] || "", // Column C
            ]),
        ];

        // Create a new workbook and worksheet
        const newWorkbook = xlsx.utils.book_new();
        const newWorksheet = xlsx.utils.aoa_to_sheet(data);

        // Append the worksheet to the workbook
        xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, "PAN Results");

        // Write the workbook to a file
        xlsx.writeFile(newWorkbook, "PAN_Matching_Results.xlsx");

        console.log(
            "PAN matching process completed and results saved to Excel"
        );
    } catch (error) {
        console.error("Error during PAN matching:", error);
    } finally {
        // Disconnect from MongoDB
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
};

// Migrate the documents from Leads to Documents collection and replacing it with objectId
async function migrateDocuments() {
    try {
        // Step 1
        console.log("Starting document migration...");
        const leads = await Lead.find({ isRejected: false });

        for (const lead of leads) {
            const { pan, document: leadDocuments } = lead;

            // Skip leads without documents
            if (!leadDocuments) {
                console.log(`Skipping lead ${lead._id} - No documents.`);
                continue;
            }

            let existingDoc = await Documents.findOne({ pan });

            if (!existingDoc) {
                // Create a new document record if none exists
                existingDoc = new Documents({
                    pan,
                    document: { singleDocuments: [], multipleDocuments: {} },
                });
            }

            // Merge singleDocuments
            const existingSingleDocs =
                existingDoc.document.singleDocuments || [];
            const newSingleDocs = leadDocuments.singleDocuments || [];

            newSingleDocs.forEach((newDoc) => {
                const existingIndex = existingSingleDocs.findIndex(
                    (doc) => doc.type === newDoc.type
                );
                if (existingIndex !== -1) {
                    // Update existing document of the same type
                    existingSingleDocs[existingIndex] = newDoc;
                } else {
                    // Add new document if type doesn't exist
                    existingSingleDocs.push(newDoc);
                }
            });

            existingDoc.document.singleDocuments = existingSingleDocs;

            // Merge multipleDocuments
            const existingMultipleDocs =
                existingDoc.document.multipleDocuments || {};
            const newMultipleDocs = leadDocuments.multipleDocuments || {};

            for (const [key, newDocs] of Object.entries(newMultipleDocs)) {
                if (!existingMultipleDocs[key]) {
                    existingMultipleDocs[key] = [];
                }
                if (newDocs === null || newDocs === undefined) {
                    continue;
                }
                existingMultipleDocs[key].push(...newDocs);
            }

            existingDoc.document.multipleDocuments = existingMultipleDocs;

            // Save the updated document
            await existingDoc.save();

            // Update the lead's document field to reference the new Document ObjectId
            lead.documents = existingDoc._id;
            // Remove the old document field (the object) from the lead
            lead.document = undefined;
            await lead.save();

            console.log(`Processed lead ${lead._id} with PAN ${pan}`);
        }

        console.log("Document migration completed successfully!");
    } catch (error) {
        console.error("An error occurred during migration:", error);
    }
}

// Function to add Loan number to Sanction records
const updateLoanNumber = async () => {
    try {
        // Step 1: Copy existing loanNo from Disbursal to Sanction
        const disbursals = await Disbursal.find({ loanNo: { $exists: true } });
        console.log(`Found ${disbursals.length} disbursal records with loanNo`);

        for (const disbursal of disbursals) {
            await Sanction.updateOne(
                { _id: disbursal.sanction.toString() },
                { $set: { loanNo: disbursal.loanNo } }
            );
        }
        console.log("Copied loanNo from Disbursal to Sanction");

        // Step 2: Find the next available loanNo
        const allSanctions = await Sanction.find({
            loanNo: { $exists: true },
        }).sort({ loanNo: 1 });
        const existingLoanNumbers = allSanctions.map((sanction) =>
            parseInt(sanction.loanNo.slice(7))
        );
        console.log("Existing loan numbers:", existingLoanNumbers);
        let nextLoanNo = 1;
        while (existingLoanNumbers.includes(nextLoanNo)) {
            nextLoanNo++;
        }

        // Step 3: Update loanNo for approved Sanction records without loanNo
        const sanctionsToUpdate = await Sanction.find({
            isApproved: true,
            loanNo: { $exists: false },
        });
        console.log(
            `Found ${sanctionsToUpdate.length} approved sanctions without loanNo`
        );

        for (const sanction of sanctionsToUpdate) {
            // Generate the next loanNo
            const newLoanNo = `NMFSPE${String(nextLoanNo).padStart(11, 0)}`;

            // Update the sanction with the new loanNo
            await Sanction.updateOne(
                { _id: sanction._id },
                { $set: { loanNo: newLoanNo } }
            );

            // Increment the nextLoanNo and ensure no duplicates
            nextLoanNo++;
            while (existingLoanNumbers.includes(nextLoanNo)) {
                nextLoanNo++;
            }
        }

        console.log("Updated loanNo for all approved sanctions without loanNo");
    } catch (error) {
        console.log(`Some error occured: ${error}`);
    }
};

// Function to migrate approved sanction applications to Closed collection under Active leads
const sanctionActiveLeadsMigration = async () => {
    try {
        const sanctions = await Sanction.find({
            isApproved: true,
            loanNo: { $exists: true },
        }).populate({
            path: "application",
            populate: { path: "lead" },
        });

        for (const sanction of sanctions) {
            const disbursal = await Disbursal.findOne({
                loanNo: sanction.loanNo,
            });

            if (disbursal) {
                const exisitingActiveLead = await Closed.findOne({
                    pan: sanction.application.lead.pan,
                });
                if (!exisitingActiveLead) {
                    const newActiveLead = await Closed.create({
                        pan: sanction.application.lead.pan,
                        data: [
                            {
                                disbursal: disbursal._id,
                                loanNo: sanction.loanNo,
                            },
                        ],
                    });

                    if (!newActiveLead) {
                        console.log(
                            "Some error occured while creating an active lead."
                        );
                    }
                } else {
                    // If the active lead exists, directly add the new loanNo to the data array
                    exisitingActiveLead.data.push({
                        disbursal: disbursal._id,
                        loanNo: sanction.loanNo,
                    });
                    await exisitingActiveLead.save();
                }
            } else {
                console.log("No Disbursal found");
            }
        }
    } catch (error) {
        console.log(`Some error occured: ${error}`);
    }
};

// Main Function to Connect and Run
async function main() {
    await connectToDatabase();
    await migrateDocuments();
    // await updateLoanNumber();
    // await sanctionActiveLeadsMigration();
    // await updateLeadsWithDocumentIds();
    // await matchPANFromExcel();
    // addRecommendedByToSanctions();
    // updateDisbursals();
    // migrateApplicationsToSanctions();
    mongoose.connection.close(); // Close the connection after the script completes
}

main().catch((error) => {
    console.error("Error during migration:", error);
    mongoose.connection.close(); // Ensure connection is closed in case of errors
});
