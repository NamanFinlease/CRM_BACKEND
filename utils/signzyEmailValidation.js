import axios from "axios";

export const signzyEmailValidation = async (email) => {
    const options = {
        method: "POST",
        url: "https://api-preproduction.signzy.app/api/v3/validation/email",
        data: {
            emailId: email,
        },
        headers: {
            "Content-type": "application/json",
            Authorization: process.env.SIGNZY_PRE_PRODUCTION_KEY,
        },
    };

    const response = await axios(options);
    return response.data.result.emailverifyData.status;
};
