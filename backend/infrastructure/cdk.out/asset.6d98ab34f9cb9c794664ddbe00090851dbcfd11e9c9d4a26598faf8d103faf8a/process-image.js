"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const sharp_1 = __importDefault(require("sharp"));
const s3Client = new client_s3_1.S3Client({});
const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
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
            // Get the original image
            const getObjectResponse = await s3Client.send(new client_s3_1.GetObjectCommand({
                Bucket: bucket,
                Key: key,
            }));
            if (!getObjectResponse.Body) {
                throw new Error('No image data found');
            }
            const imageBuffer = Buffer.from(await getObjectResponse.Body.transformToByteArray());
            // Create 400x400 resized image
            const resizedBuffer = await (0, sharp_1.default)(imageBuffer)
                .resize(400, 400, { fit: 'cover' })
                .png()
                .toBuffer();
            // Create 50x50 thumbnail
            const thumbnailBuffer = await (0, sharp_1.default)(imageBuffer)
                .resize(50, 50, { fit: 'cover' })
                .png()
                .toBuffer();
            // Upload resized images
            const resizedKey = `resized-${key.replace(/\.[^/.]+$/, '.png')}`;
            const thumbnailKey = `thumbnail-${key.replace(/\.[^/.]+$/, '.png')}`;
            await Promise.all([
                s3Client.send(new client_s3_1.PutObjectCommand({
                    Bucket: bucket,
                    Key: resizedKey,
                    Body: resizedBuffer,
                    ContentType: 'image/png',
                })),
                s3Client.send(new client_s3_1.PutObjectCommand({
                    Bucket: bucket,
                    Key: thumbnailKey,
                    Body: thumbnailBuffer,
                    ContentType: 'image/png',
                })),
            ]);
            // Extract dogId from filename (assuming format: dogId-original.jpg)
            const dogId = key.split('-')[0];
            // Update DynamoDB with image URLs
            const baseUrl = `https://${bucket}.s3.amazonaws.com`;
            await docClient.send(new lib_dynamodb_1.UpdateCommand({
                TableName: DOGS_TABLE,
                Key: { dogId },
                UpdateExpression: 'SET originalImageUrl = :original, resizedImageUrl = :resized, thumbnailUrl = :thumbnail',
                ExpressionAttributeValues: {
                    ':original': `${baseUrl}/${key}`,
                    ':resized': `${baseUrl}/${resizedKey}`,
                    ':thumbnail': `${baseUrl}/${thumbnailKey}`,
                },
            }));
            console.log(`Successfully processed image for dog: ${dogId}`);
        }
        catch (error) {
            console.error('Error processing image:', error);
            throw error;
        }
    }
};
exports.handler = handler;
