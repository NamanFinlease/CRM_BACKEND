import Application from "../models/Applications.js";
import CamDetails from "../models/CAM.js";
import { dateFormatter, dateStripper } from "./dateFormatter.js";

export const getSanctionData = async (id) => {
    // Fetch application and CAM details
    const application = await Application.findById(id).populate("applicant");
    const camDetails = await CamDetails.findOne({ leadId: application.lead });

    if (!application) {
        throw new Error("Application not found");
    }

    // Stripping the time from the date to compare
    const sanctionDate = dateStripper(new Date());
    const disbursalDate = dateStripper(camDetails?.details.disbursalDate);

    // Date validation
    if (
        (application.sanctionDate &&
            application.sanctionDate > disbursalDate) || // Strip time from `sanctionDate`
        sanctionDate > disbursalDate
    ) {
        throw new Error(
            "Disbursal Date cannot be in the past. It must be the present date or future date!"
        );
    }

    // Create a response object with all common fields
    const response = {
        sanctionDate: sanctionDate,
        title: "Mr./Ms.",
        fullname: `${application.applicant.personalDetails.fName} ${application.applicant.personalDetails.mName} ${application.applicant.personalDetails.lName}`,
        residenceAddress: `${application.applicant.residence.address}, ${application.applicant.residence.city}`,
        stateCountry: `${application.applicant.residence.state}, India - ${application.applicant.residence.pincode}`,
        mobile: `${application.applicant.personalDetails.mobile}`,
        loanAmount: `${new Intl.NumberFormat().format(
            camDetails?.details.loanRecommended
        )}`,
        roi: `${camDetails?.details.eligibleRoi}`,
        disbursalDate: dateFormatter(camDetails?.details.disbursalDate),
        repaymentAmount: `${new Intl.NumberFormat().format(
            camDetails?.details.repaymentAmount
        )}`,
        tenure: `${camDetails?.details.eligibleTenure}`,
        repaymentDate: dateFormatter(camDetails?.details.repaymentDate),
        penalInterest: `${camDetails?.details.penalInterest || "0"}`,
        processingFee: `${new Intl.NumberFormat().format(
            camDetails?.details.totalAdminFeeAmount
        )}`,
        // repaymentCheques: `${camDetails?.details.repaymentCheques || "-"}`,
        // bankName: `${bankName || "-"}`,
        bouncedCharges: "1000",
        // annualPercentageRate: `${
        //     camDetails?.details.annualPercentageRate || "0"
        // }`,
    };

    return { application, camDetails, response };
};
