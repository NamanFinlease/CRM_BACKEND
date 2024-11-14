import mongoose from "mongoose";
import Application from "../models/Applications.js";
import Disbursal from "../models/Disbursal.js";
import Lead from "../models/Leads.js";
import Sanction from "../models/Sanction.js";
import Employee from "../models/Employees.js";
import xlsx from "xlsx";

// const mongoURI =    "mongodb+srv://manish:OnlyoneLoan%40007@cluster0.vxzgi.mongodb.net/LoanSystem?retryWrites=true&w=majority&appName=Cluster0";
const mongoURI =
    "mongodb+srv://ajay:zdYryDsVh90hIhMc@crmproject.4u20b.mongodb.net/LoanSystem?retryWrites=true&w=majority&appName=CRMProject";

const migrateApplicationsToSanctions = async () => {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to MongoDB");

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

const updateDisbursals = async () => {
    try {
        await mongoose.connect(mongoURI);

        console.log("Connected to MongoDB");

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

const addRecommendedByToSanctions = async () => {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to MongoDB");

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
        // Connect to MongoDB
        await mongoose.connect(mongoURI);
        console.log("Connected to MongoDB");

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
                        // Sanction found, log or process as needed
                        // console.log(`Sanction found: ${sanction._id}`);
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
                    // console.log(`No application found for lead ${lead._id}`);
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

// Run the script
matchPANFromExcel();

// addRecommendedByToSanctions();

// updateDisbursals();

// migrateApplicationsToSanctions();
