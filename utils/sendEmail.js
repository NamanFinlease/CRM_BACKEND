import axios from "axios";

const apiKey = process.env.ZOHO_APIKEY;

async function sendEmail(recipient, recipientName, subject,token) {
    const link = `http://localhost:3000/verify-aadhaar/${token}`
    try {
        const options = {
            method: "POST",
            url: "https://api.zeptomail.in/v1.1/email",
            headers: {
                accept: "application/json",
                authorization: apiKey,
                "cache-control": "no-cache",
                "content-type": "application/json",
            },
            data: JSON.stringify({
                from: { address: "info@only1loan.com" },
                to: [
                    {
                        email_address: {
                            address: recipient,
                            name: recipientName,
                        },
                    },
                ],
                subject: subject,
                htmlbody: `<p>To verify your aadhaar click on <strong>${link}</strong>.</p>`,
            }),
        };

        const response = await axios(options);

        return response.data;
    } catch (error) {
        console.log(error);
        throw new Error("Error sending email", error.message);
    }
}

export default sendEmail;
