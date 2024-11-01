import puppeteer from "puppeteer";
import { uploadDocs } from "./docsUploadAndFetch.js";

export async function htmlToPdf(lead, htmlResponse, fieldName) {
    try {
        // Launch a new browser instance
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Set the HTML content for the page
        await page.setContent(htmlResponse[0]);

        // Generate a PDF from the HTML content
        const pdfBuffer = await page.pdf({
            format: "A4", // Page format
        });

        //   close the browser
        await browser.close();

        // Use the utility function to upload the PDF buffer
        const result = await uploadDocs(lead, null, {
            isBuffer: true,
            buffer: pdfBuffer,
            fieldName: fieldName,
        });

        if (!result) {
            return { success: false };
        }
        return { success: true };
    } catch (error) {
        console.error("Error while creating PDF or directory:", error);
    }
}
