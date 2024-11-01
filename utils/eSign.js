import axios from "axios";
import { getDocs } from "./docsUploadAndFetch.js";
import Lead from "../models/Leads.js";

export async function initiateEsignContract(id, docType) {
    const lead = await Lead.findById(id);
    const pdfUrl = await getDocs(lead, docType);
    const aadhaar = lead.aadhaar.slice(-4);

    let yearOfBirth = new Date(lead.dob);
    yearOfBirth = yearOfBirth.getFullYear();

    const options = {
        method: "POST",
        url: "https://api-preproduction.signzy.app/api/v3/contract/initiate",
        maxBodyLength: Infinity,
        headers: {
            Authorization: process.env.SIGNZY_PRE_PRODUCTION_KEY,
            "Content-Type": "application/json",
        },
        data: JSON.stringify({
            pdf: pdfUrl.preSignedUrl,
            contractName: "Sanction Letter",
            contractExecuterName: "Signzy",
            eSignProvider: "NSDL",
            signerdetail: [
                {
                    signerName: `${lead.fName}${
                        lead.mName && ` ${lead.mName}`
                    } ${lead.lName}`,
                    signerGender: `${lead.gender === "M" ? "male" : "female"}`,
                    signatureType: "AADHAARESIGN-OTP",
                    uidLastFourDigits: aadhaar,
                    signerYearOfBirth: `${yearOfBirth}`,
                    signatures: [
                        {
                            pageNo: ["All"],
                            signaturePosition: ["BottomLeft"],
                        },
                    ],
                },
            ],
            workflow: true,
            signerCallbackUrlAuthorizationHeader: "test",
            nameMatchThreshold: "0.90",
            allowSignerYOBMatch: true,
            allowSignerGenderMatch: true,
        }),
    };

    const response = await axios(options);
    return response;
}
