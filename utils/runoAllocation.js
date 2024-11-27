import axios from "axios";

async function runoLeadAllocation(leadData) {
    try {
        const fName = "Test",
            mName = "",
            lName = "Again",
            mobile = "+919199479407";
        // const { fName, mName, lName, mobile } = leadData;

        // Constructing the payload dynamically from the input
        const payload = {
            customer: {
                name: `${fName} ${mName || ""} ${lName}`.trim(),
                phoneNumber: mobile,
                // email: leadData.email || "", // Optional if not provided
                // company: {
                //     name: leadData.companyName || "Unknown Company", // Default value
                //     address: {
                //         street: leadData.street || "",
                //         city: leadData.city || "",
                //         state: leadData.state || "",
                //         country: leadData.country || "",
                //         pincode: leadData.pincode || "",
                //     },
                //     kdm: {
                //         name: leadData.kdmName || "",
                //         phoneNumber: leadData.kdmPhone || "",
                //     },
                // },
            },
            priority: 3, // Default priority if not provided
            // notes: leadData.notes || "No notes provided.",
            // processName: leadData.processName || "Default Process",
            processName: "Sanction",
            assignedTo: "+919990831500",
            userFields: [
                {
                    name: "source",
                    value: "Referral",
                },
                {
                    name: "status",
                    value: "Cold Followup",
                },
                {
                    name: "Followup On",
                    value: 1603171442,
                },
            ],
            // assignedTo: leadData.assignedTo || "",
            // userFields: leadData.userFields || [],
        };

        // Sending the API request
        const response = await axios.post(
            "https://api.runo.in/v1/crm/allocation",
            payload,
            {
                headers: {
                    "Auth-Key": "MTJ1OGVzM25hcm81cTZhNWc=", // Replace with the actual key
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("Lead allocated successfully:", response.data);
        return response.data; // Return API response to the caller
    } catch (error) {
        console.error("Error during lead allocation:", error.message);
        // Return or throw the error for the caller to handle
        throw {
            message: error.message,
            details: error.response?.data || "No additional details",
        };
    }
}

runoLeadAllocation();

// export default runoLeadAllocation;
