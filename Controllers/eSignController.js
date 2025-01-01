import asyncHandler from "../middleware/asyncHandler.js";
import axios from "axios";
import Lead from "../models/Leads.js";
import Documents from "../models/Documents.js";
import { uploadDocs } from "../utils/docsUploadAndFetch.js";

export const initiate = async (leadId, fName, lName, email, mobile) => {
    // Step-1: Initiate E-sign
    const eSignStepOne = await axios.post(
        "https://api.digitap.ai/clickwrap/v1/intiate",
        {
            docClassId: "EI358OTPESIG24561",
            reason: "Loan Agreement",
            signersInfo: [
                {
                    fname: `${fName}`,
                    lname: `${lName}`,
                    email: `${email}`,
                    mobile: `${mobile}`,
                    signerType: "signer1",
                },
            ],
        },
        {
            headers: {
                ent_authorization: process.env.DIGITAP_AUTH_KEY,
                "Content-Type": "application/json",
            },
        }
    );

    const lead = await Lead.findOneAndUpdate(
        { _id: leadId },
        { transactionId: eSignStepOne.data.model.entTransactionId },
        { new: true }
    );

    if (!lead) {
        res.status(404);
        throw new Error({ success: false, message: "Lead not found." });
    }

    return eSignStepOne;
};

export const sendLinkToCustomer = async (eSignStepOne, formData) => {
    if (eSignStepOne.data.code === "200") {
        const eSignStepTwo = await axios.put(
            `${eSignStepOne.data.model.uploadUrl}`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(), // Required to set proper Content-Type boundary
                },
            }
        );

        const eSignStepThree = await axios.post(
            "https://api.digitap.ai/clickwrap/v1/send/sign-in-link",
            {
                docTransactionId: `${eSignStepOne.data.model.docTransactionId}`,
                sendNotification: true,
            },
            {
                headers: {
                    ent_authorization: process.env.DIGITAP_AUTH_KEY,
                    "Content-Type": "application/json",
                },
            }
        );
        return eSignStepThree.data;
    }
};

// @desc Esign webhook for Digitap to send us a response if doc is esigned
// @route POST /api/sanction/esign/success
// @access Public
export const eSignWebhook = asyncHandler(async (req, res) => {
    const data = req.body;
    if (data["signers-info"][0].status !== "SIGNED") {
        res.status(400);
        throw new Error("Document not signed!!");
    }

    const response = await getDoc(data.entTransactionId);

    if (!response.success) {
        res.status(400);
        throw new Error(response.message);
    }

    res.status(200).json({
        success: true,
        message: "Document signed and saved successfully.",
    });
});

export const getDoc = async (transactionId) => {
    try {
        const lead = await Lead.findOne({ transactionId: transactionId });
        const docs = await Documents.findOne({ _id: lead.documents });
        console.log(docs);

        const eSignStepfour = await axios.post(
            "https://api.digitap.ai/clickwrap/v1/get-doc-url",
            {
                transactionId: `${transactionId}`,
            },
            {
                headers: {
                    ent_authorization: process.env.DIGITAP_AUTH_KEY,
                    "Content-Type": "application/json",
                },
            }
        );

        const eSignStepfive = await axios.get(
            eSignStepfour.data.model.previewUrl
        );

        // Use the utility function to upload the PDF buffer
        const result = await uploadDocs(docs, null, null, {
            rawPdf: eSignStepfive.data,
            rawPdfKey: "sanctionLetter",
        });
        if (!result) {
            return { success: false, message: "Failed to upload PDF." };
        }
        return {
            success: true,
            message: "File uploaded.",
        };
    } catch (error) {
        console.log(error.data.message);
    }
};
