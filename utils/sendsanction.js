import axios from "axios";
import { initiateEsignContract } from "./eSign.js";
import { htmlToPdf } from "./htmlToPdf.js";
import { sanctionLetter } from "./sanctionLetter.js";

const apiKey = process.env.ZOHO_APIKEY;

export const generateSanctionLetter = async (
    subject,
    sanctionDate,
    title,
    fullname,
    mobile,
    residenceAddress,
    stateCountry,
    camDetails,
    lead,
    recipientEmail
) => {
    try {
        const htmlToSend = sanctionLetter(
            sanctionDate,
            title,
            fullname,
            mobile,
            residenceAddress,
            stateCountry,
            camDetails
        );

        // Save the sanction letter in S3
        // await htmlToPdf(lead, htmlToSend);

        // Call eSign API
        // const contract = await initiateEsignContract(
        //     lead._id,
        //     "sanctionLetter"
        // );

        // response?.data?.signerdetail[0]?.workflowUrl  eSign url

        // Setup the options for the ZeptoMail API
        const options = {
            method: "POST",
            url: "https://api.zeptomail.in/v1.1/email",
            headers: {
                accept: "application/json",
                authorization: `Zoho-enczapikey ${apiKey}`,

                // "Zoho-enczapikey PHtE6r1eFL/rjzF68UcBsPG/Q8L1No16/b5jKgkU44hBCPMFS00Eo49/xjO/ohkqU6JBRqTJy45v572e4u/TcWflNm1JWGqyqK3sx/VYSPOZsbq6x00etVkdd03eVoLue95s0CDfv9fcNA==",
                "cache-control": "no-cache",
                "content-type": "application/json",
            },
            data: JSON.stringify({
                from: { address: "info@fintechbasket.com" },
                to: [
                    {
                        email_address: {
                            address: recipientEmail,
                            name: fullname,
                        },
                    },
                ],
                subject: subject,
                // htmlbody: `<div><p>To approve the loan, please verify and sign the sanction letter.</p><br/><a href=${response?.data?.signerdetail[0]?.workflowUrl}>${response?.data?.signerdetail[0]?.workflowUrl}</a></div>`,
                htmlbody: htmlToSend,
            }),
        };
        // Make the request to the ZeptoMail API
        const response = await axios(options);
        if (response.data.message === "OK") {
            // await htmlToPdf(lead, htmlToSend);
            return {
                success: true,
                message: "Sanction letter sent and saved successfully",
            };
        }
        return {
            success: false,
            message: "Failed to send email",
        };
    } catch (error) {
        return {
            success: false,
            message: `"Error in ZeptoMail API" ${error.message}`,
        };
    }
};
