import puppeteer from "puppeteer";
import { chromium } from "playwright";
import { uploadDocs } from "./docsUploadAndFetch.js";

export async function htmlToPdf(docs, htmlResponse, fieldName) {
    let browser;
    try {
        // Launch a new browser instance
        browser = await chromium.launch();
        const page = await browser.newPage();

        // Set the HTML content for the page
        await page.setContent(htmlResponse[0]);

        // Generate a PDF from the HTML content
        const pdfBuffer = await page.pdf({
            format: "A4", // Page format
        });

        //   close the browser
        await browser.close();

        if (fieldName === "cibilReport") {
            // Use the utility function to upload the PDF buffer
            const result = await uploadDocs(docs, null, null, {
                isBuffer: true,
                buffer: pdfBuffer,
                fieldName: fieldName,
            });

            if (!result) {
                return { success: false, message: "Failed to upload PDF." };
            }
            return { success: true, message: "File uploaded." };
        }

        // Define the file path where the PDF will be saved temporarily
        const tempFilePath = path.join(__dirname, "temp_sanction_letter.pdf");

        // Save the PDF to a file
        fs.writeFileSync(tempFilePath, pdfBuffer);
        console.log(`PDF saved to: ${tempFilePath}`);

        // Set a timeout to delete the file after the specified time (in milliseconds)
        setTimeout(() => {
            fs.unlink(tempFilePath, (err) => {
                if (err) {
                    console.error("Error deleting file:", err);
                } else {
                    console.log(
                        `File deleted after ${timeoutMinutes} minutes.`
                    );
                }
            });
        }, 30 * 60 * 1000);

        return tempFilePath;

        // Use the utility function to upload the PDF buffer
        // const result = await uploadDocs(lead, null, {
        //     isBuffer: true,
        //     buffer: pdfBuffer,
        //     fieldName: fieldName,
        // });

        // if (!result) {
        //     return { success: false, message: "Failed to upload PDF." };
        // }
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        // Ensure the browser is closed
        if (browser) {
            await browser.close();
        }
    }
}
