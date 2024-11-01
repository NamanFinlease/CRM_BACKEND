import axios from "axios";
import Bank from "../models/ApplicantBankDetails.js";

export const verifyBank = async (
    beneficiaryName,
    bankAccNo,
    accountType,
    ifscCode,
    bankName,
    branchName,
    applicant
) => {
    try {
        // Check if there's already existing bank details for this applicant
        let bankDetails = await Bank.findOne({
            borrowerId: applicant._id.toString(),
        });

        const { mobile, personalEmail } = applicant.personalDetails;

        if (!bankDetails) {
            // const options = {
            //     method: "POST",
            //     url: "https://api-preproduction.signzy.app/api/v3/bankaccountverifications/advancedverification",
            //     data: {
            //         beneficiaryAccount: bankAccNo,
            //         beneficiaryIFSC: ifscCode,
            //         beneficiaryMobile: mobile,
            //         nameFuzzy: true,
            //         beneficiaryName: beneficiaryName,
            //         email: personalEmail,
            //     },
            //     headers: {
            //         "Content-type": "application/json",
            //         Authorization: process.env.SIGNZY_PRE_PRODUCTION_KEY,
            //     },
            // };

            // const response = await axios(options);

            // if (response.result.reason === "success") {
            //     const newBank = await Bank.create({
            //         borrowerId: id,
            //         beneficiaryName,
            //         bankName,
            //         bankAccNo,
            //         accountType,
            //         ifscCode,
            //         branchName,
            //     });

            //     if (newBank) {
            //         return {
            //             success: true,
            //             message: "Bank verified and saved.",
            //         };
            //     }
            // }

            const newBank = await Bank.create({
                borrowerId: applicant._id.toString(),
                beneficiaryName,
                bankName,
                bankAccNo,
                accountType,
                ifscCode,
                branchName,
            });

            if (newBank) {
                return {
                    success: true,
                    message: "Bank verified and saved.",
                };
            }

            return { success: false, message: "Bank couldn't be verified!!" };
        }
    } catch (error) {
        console.log({ status: error.status, message: error.message });
    }
};
