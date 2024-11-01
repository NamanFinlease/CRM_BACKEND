import axios from "axios";

const data = JSON.stringify({
    aadhaarNumber: "750988368893",
});

const config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://api-preproduction.signzy.app/api/v3/getOkycOtp",
    headers: {
        "Content-Type": "application/json",
        Authorization: "Ks7wDpfSe075bPYvWH6zzQHmoirMD51O",
    },
    data: data,
};

axios
    .request(config)
    .then((response) => {
        console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
        console.log(error);
    });
