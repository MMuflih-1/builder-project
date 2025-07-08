"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
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
            // Extract dogId from filename
            // Formats: uuid-original.jpg OR generated-dog-timestamp.jpg
            let dogId;
            if (key.includes('-original.')) {
                // Standard upload format: uuid-original.jpg
                const parts = key.split('-');
                if (parts.length >= 6 && parts[5].startsWith('original')) {
                    dogId = parts.slice(0, 5).join('-');
                }
            }
            else if (key.startsWith('generated-dog-')) {
                // AI generated format: generated-dog-timestamp.jpg
                // Use the full filename as dogId for generated images
                dogId = key.replace(/\.(jpg|jpeg|png)$/i, '');
            }
            if (!dogId) {
                console.error(`Could not extract dogId from filename: ${key}`);
                continue;
            }
            console.log(`Extracted dogId: ${dogId} from key: ${key}`);
            // For now, use the original image for all sizes
            const baseUrl = `https://${bucket}.s3.amazonaws.com`;
            console.log(`Updating DynamoDB for dogId: ${dogId}`);
            try {
                await docClient.send(new lib_dynamodb_1.UpdateCommand({
                    TableName: DOGS_TABLE,
                    Key: { dogId },
                    UpdateExpression: 'SET originalImageUrl = :original, resizedImageUrl = :resized, thumbnailUrl = :thumbnail',
                    ExpressionAttributeValues: {
                        ':original': `${baseUrl}/${key}`,
                        ':resized': `${baseUrl}/${key}`,
                        ':thumbnail': `${baseUrl}/${key}`,
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
