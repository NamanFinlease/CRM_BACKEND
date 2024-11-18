import axios from "axios";
import { yyyy_mm_dd } from "./dateFormatter.js";

async function fetchCibil(lead) {
    try {
        const { fName, mName, lName, dob, mobile, pan } = lead;
        const data = {
            RequestHeader: {
                CustomerId: "9757",
                UserId: "STS_NAMCCR",
                Password: "W3#QeicsB",
                MemberNumber: "007FZ03434",
                SecurityCode: "2DN",
                CustRefField: "123456",
                ProductCode: ["CCR"],
            },
            RequestBody: {
                InquiryPurpose: "00",
                FirstName: fName,
                MiddleName: mName ?? "",
                LastName: lName ?? "",
                DOB: yyyy_mm_dd(dob),
                InquiryAddresses: [
                    {
                        seq: "1",
                        AddressType: ["H"],
                        AddressLine1: "new delhi ",
                        State: "DL",
                        Postal: "110057",
                    },
                ],
                InquiryPhones: [
                    {
                        seq: "1",
                        Number: mobile,
                        PhoneType: ["M"],
                    },
                ],
                IDDetails: [
                    {
                        seq: "1",
                        IDType: "T",
                        IDValue: pan,
                        Source: "Inquiry",
                    },
                    {
                        seq: "2",
                        IDType: "P",
                        IDValue: "",
                        Source: "Inquiry",
                    },
                    {
                        seq: "3",
                        IDType: "V",
                        IDValue: "",
                        Source: "Inquiry",
                    },
                    {
                        seq: "4",
                        IDType: "D",
                        IDValue: "",
                        Source: "Inquiry",
                    },
                    {
                        seq: "5",
                        IDType: "M",
                        IDValue: "",
                        Source: "Inquiry",
                    },
                    {
                        seq: "6",
                        IDType: "R",
                        IDValue: "",
                        Source: "Inquiry",
                    },
                    {
                        seq: "7",
                        IDType: "O",
                        IDValue: "",
                        Source: "Inquiry",
                    },
                ],
                MFIDetails: {
                    FamilyDetails: [
                        {
                            seq: "1",
                            AdditionalNameType: "K01",
                            AdditionalName: "",
                        },
                        {
                            seq: "2",
                            AdditionalNameType: "K01",
                            AdditionalName: "",
                        },
                    ],
                },
            },
            Score: [
                {
                    Type: "ERS",
                    Version: "4.0",
                },
            ],
        };

        const stringifiedData = JSON.stringify(data, null, 4);

        const response = await axios.post(
            "https://ists.equifax.co.in/cir360service/cir360report",
            stringifiedData,
            {
                headers: {
                    "Content-type": "application/json",
                },
            }
        );

        return response.data;
    } catch (error) {
        throw new Error("Error fetching CIBIL", error.message);
    }
}

export default fetchCibil;
