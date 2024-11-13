import mongoose from "mongoose";
import Disbursal from "../models/Disbursal.js";
import Application from "../models/Applications.js";
import Sanction from "../models/Sanction.js";

const migrateApplicationsToSanctions = async () => {
    try {
        await mongoose.connect(
            "mongodb+srv://manish:OnlyoneLoan%40007@cluster0.vxzgi.mongodb.net/LoanSystem?retryWrites=true&w=majority&appName=Cluster0"
        );
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
        await mongoose.connect(
            "mongodb+srv://manish:OnlyoneLoan%40007@cluster0.vxzgi.mongodb.net/LoanSystem?retryWrites=true&w=majority&appName=Cluster0"
        );

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
        await mongoose.connect(
            "mongodb+srv://manish:OnlyoneLoan%40007@cluster0.vxzgi.mongodb.net/LoanSystem?retryWrites=true&w=majority&appName=Cluster0"
        );
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

// addRecommendedByToSanctions();

// updateDisbursals();

// migrateApplicationsToSanctions();
