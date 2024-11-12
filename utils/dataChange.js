import mongoose from "mongoose";
import Application from "../models/Applications.js";
import Sanction from "../models/Sanction.js";

const migrateApplicationsToSanctions = async () => {
    try {
        await mongoose.connect(
            "mongodb+srv://ajay:zdYryDsVh90hIhMc@crmproject.4u20b.mongodb.net/LoanSystem?retryWrites=true&w=majority&appName=CRMProject"
        );
        console.log("Connected to MongoDB");

        const applications = await Application.find({ isRecommended: true });

        // const existingSanction = await Sanction.findOne({
        //     application: application._id,
        // });

        // if (!existingSanction) {
        //     const newSanctionData = {
        //         application: application._id,
        //         isChanged: true,
        //     };

        //     // Populate sanction data based on application conditions
        //     console.log("Application: ", application.isApproved);

        //     if (application.isApproved) {
        //         newSanctionData.isApproved = true;
        //         newSanctionData.approvedBy = application.approvedBy; // Assuming recommendedBy holds approval info
        //         newSanctionData.sanctionDate = application.sanctionDate;
        //         // console.log("New Sanction: ", newSanctionData);
        //     }

        //     // Create the new Sanction document
        //     const newSanction = new Sanction(newSanctionData);
        //     await newSanction.save();
        //     // console.log(newSanction);

        //     console.log(
        //         `Created sanction for application ID: ${application._id}`
        //     );
        // } else {
        //     console.log(
        //         `Sanction already exists for application ID: ${application._id}`
        //     );
        // }

        for (const application of applications) {
            const existingSanction = await Sanction.findOne({
                application: application._id,
            });

            if (!existingSanction) {
                const newSanctionData = {
                    application: application._id,
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

migrateApplicationsToSanctions();
