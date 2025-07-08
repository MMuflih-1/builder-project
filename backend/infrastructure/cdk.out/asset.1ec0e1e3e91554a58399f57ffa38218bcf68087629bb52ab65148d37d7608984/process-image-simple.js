"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_s3_1 = require("@aws-sdk/client-s3");
const sharp_1 = __importDefault(require("sharp"));
const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new client_s3_1.S3Client({});
const DOGS_TABLE = process.env.DOGS_TABLE_NAME;
const handler = async (event) => {
    for (const record of event.Records) {
        try {
            const bucket = record.s3.bucket.name;
            const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
            // Skip if already processed (avoid infinite loops)
            if (key.includes('resized-') || key.includes('thumbnail-')) {
                continue;
            }
            console.log(`Processing image: ${key}`);
            // Extract dogId from filename (format: uuid-original.jpg)
            // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-original.jpg
            const parts = key.split('-');
            let dogId;
            if (parts.length >= 6 && parts[5].startsWith('original')) {
                // Reconstruct full UUID (first 5 parts)
                dogId = parts.slice(0, 5).join('-');
                console.log(`Extracted dogId: ${dogId} from key: ${key}`);
            }
            else {
                console.error(`Invalid filename format: ${key}`);
                continue;
            }
            // Get the original image from S3
            const getObjectCommand = new client_s3_1.GetObjectCommand({
                Bucket: bucket,
                Key: key,
            });
            const response = await s3Client.send(getObjectCommand);
            const imageBuffer = Buffer.from(await response.Body.transformToByteArray());
            // Create resized image (400x400)
            const resizedBuffer = await (0, sharp_1.default)(imageBuffer)
                .resize(400, 400, { fit: 'cover' })
                .jpeg({ quality: 85 })
                .toBuffer();
            // Create thumbnail (50x50)
            const thumbnailBuffer = await (0, sharp_1.default)(imageBuffer)
                .resize(50, 50, { fit: 'cover' })
                .jpeg({ quality: 80 })
                .toBuffer();
            // Upload resized image
            const resizedKey = key.replace(/\.(jpg|jpeg|png)$/i, '-resized.jpg');
            await s3Client.send(new client_s3_1.PutObjectCommand({
                Bucket: bucket,
                Key: resizedKey,
                Body: resizedBuffer,
                ContentType: 'image/jpeg',
            }));
            // Upload thumbnail
            const thumbnailKey = key.replace(/\.(jpg|jpeg|png)$/i, '-thumbnail.jpg');
            await s3Client.send(new client_s3_1.PutObjectCommand({
                Bucket: bucket,
                Key: thumbnailKey,
                Body: thumbnailBuffer,
                ContentType: 'image/jpeg',
            }));
            const baseUrl = `https://${bucket}.s3.amazonaws.com`;
            console.log(`Updating DynamoDB for dogId: ${dogId}`);
            try {
                await docClient.send(new lib_dynamodb_1.UpdateCommand({
                    TableName: DOGS_TABLE,
                    Key: { dogId },
                    UpdateExpression: 'SET originalImageUrl = :original, resizedImageUrl = :resized, thumbnailUrl = :thumbnail',
                    ExpressionAttributeValues: {
                        ':original': `${baseUrl}/${key}`,
                        ':resized': `${baseUrl}/${resizedKey}`,
                        ':thumbnail': `${baseUrl}/${thumbnailKey}`,
                    },
                    ReturnValues: 'ALL_NEW'
                }));
                console.log(`Successfully updated DynamoDB for dogId: ${dogId}`);
            }
            catch (dbError) {
                console.error(`Failed to update DynamoDB for dogId: ${dogId}`, dbError);
                throw dbError;
            }
            console.log(`Successfully processed image for dog: ${dogId}`);
        }
        catch (error) {
            console.error('Error processing image:', error);
            throw error;
        }
    }
};
exports.handler = handler;
