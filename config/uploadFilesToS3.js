import S3 from "aws-sdk/clients/s3.js";

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION;
const bucketName = process.env.AWS_BUCKET_NAME;

const s3 = new S3({ region, accessKeyId, secretAccessKey });

// Upload files to S3
async function uploadFilesToS3(buffer, key) {
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
    try {
        let fileSize;

        // Determine if the input is a buffer or a file
        if (Buffer.isBuffer(buffer)) {
            fileSize = input.length; // For buffers, use the `length` property
        } else if (input && input.size) {
            fileSize = input.size; // For file objects, use the `size` property
        }
        // Check file size before uploading
        if (fileSize > MAX_FILE_SIZE) {
            throw new Error("File size exceeds 25 MB");
        }

        var params = {
            Bucket: bucketName,
            Body: Buffer.isBuffer(buffer) ? buffer : buffer.stream(),
            Key: key,
        };
        return await s3.upload(params).promise();
    } catch (error) {
        console.log(error);
    }
}

// Delete old files from S3
async function deleteFilesFromS3(key) {
    try {
        const params = {
            Bucket: bucketName,
            Key: key,
        };
        await s3.deleteObject(params).promise();
        console.log(`File deleted successfully: ${key}`);
    } catch (error) {
        console.error(`Error deleting file: ${key}`, error);
        throw new Error("Failed to delete old file from S3");
    }
}

// Generate a pre-signed URL for each document
const generatePresignedUrl = (key, mimeType) => {
    const params = {
        Bucket: bucketName,
        Key: key,
        Expires: 3 * 60 * 60, // Set expiration time in seconds (e.g., 1 hour)
        ResponseContentDisposition: "inline", // Display the file in the browser
        ResponseContentType: mimeType || "application/octet-stream", // Ensure correct MIME type
    };
    return s3.getSignedUrl("getObject", params);
};

// Copy files from old Pan to new Pan
async function renamePanFolder(oldPan, newPan) {
    const oldFolder = `${oldPan}/`;
    const newFolder = `${newPan}/`;

    try {
        // Step 1: List all objects in the old folder
        const listParams = {
            Bucket: bucketName,
            Prefix: oldFolder,
        };
        const listedObjects = await s3.listObjectsV2(listParams).promise();

        if (!listedObjects.Contents.length) {
            console.log(`No files found in folder: ${oldFolder}`);
            return;
        }
        // Step 2: Copy objects to the new folder
        const copyPromises = listedObjects.Contents.map(async (object) => {
            const oldKey = object.Key;
            const newKey = oldKey.replace(oldFolder, newFolder);

            await s3
                .copyObject({
                    Bucket: bucketName,
                    CopySource: `${bucketName}/${oldKey}`,
                    Key: newKey,
                })
                .promise();
        });
        await Promise.all(copyPromises);

        try {
            // Step 3: Delete objects in the old folder
            const deleteParams = {
                Bucket: bucketName,
                Delete: {
                    Objects: listedObjects.Contents.map((object) => ({
                        Key: object.Key,
                    })),
                },
            };

            await s3.deleteObjects(deleteParams).promise();
            console.log(`Deleted all files from folder: ${oldFolder}`);
        } catch (error) {
            console.log("Error deleting the old folder", error);
        }
        return { success: true };
    } catch (error) {
        return { success: true, message: `Error renaming folder: ${error}` };
    }
}

export {
    uploadFilesToS3,
    deleteFilesFromS3,
    generatePresignedUrl,
    renamePanFolder,
};
