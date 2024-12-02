import axios from "axios";

export async function panVerify(leadId, pan) {
    const data = {
        client_ref_num: `${leadId}`,
        pan: `${pan}`,
    };

    const response = await axios.post(
        "https://svc.digitap.ai/validation/kyc/v1/pan_details",
        data,
        {
            headers: {
                authorization: process.env.DIGITAP_AUTH_KEY,
                "Content-Type": "application/json",
            },
        }
    );
    return response.data;
}

export async function panAadhaarLinkage(pan, aadhaar) {
    const data = {
        pan: `${pan}`,
        aadhaar: `${aadhaar}`,
    };

    const response = await axios.post(
        "https://www.timbleglance.com/api/pan_adhr_link_v_2/",
        data,
        {
            headers: {
                "api-key": process.env.TIMBLE_APIKEY,
                "app-id": process.env.TIMBLE_APPID,
                "Content-Type": "application/json",
            },
        }
    );
    return response;
}
