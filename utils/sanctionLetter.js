import handlebars from "handlebars";
import * as fs from "fs";
import path from "path";
import { dateFormatter } from "./dateFormatter.js";
import { fileURLToPath } from "url";

export function sanctionLetter(
    sanctionDate,
    title,
    fullname,
    mobile,
    residenceAddress,
    stateCountry,
    camDetails
) {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const filePath = path.join(__dirname, "../config/sanction.html");
        const source = fs.readFileSync(filePath, "utf-8").toString();

        const template = handlebars.compile(source);

        let replacements = {
            sanctionDate: `${sanctionDate}`,
            title: `${title}`,
            fullname: `${fullname}`,
            residenceAddress: `${residenceAddress}`,
            stateCountry: `${stateCountry}`,
            mobile: `${mobile}`,
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

        let htmlToSend = template(replacements);

        // footer =
        //     "https://publicramlella.s3.ap-south-1.amazonaws.com/public_assets/Footer.jpg";
        // header =
        //     "https://publicramlella.s3.ap-south-1.amazonaws.com/public_assets/Header.jpg";

        return htmlToSend;
    } catch (error) {
        return {
            success: false,
            message: `"Error in adding the template" ${error.message}`,
        };
    }
}
