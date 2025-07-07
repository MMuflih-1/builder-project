"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDogStatus = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const DOGS_TABLE = process.env.DOGS_TABLE_NAME;
const updateDogStatus = async (dogId, status) => {
    try {
        console.log(`Updating dog ${dogId} status to ${status}`);
        const now = new Date().toISOString();
        await docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: DOGS_TABLE,
            Key: { dogId },
            UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':status': status,
                ':updatedAt': now
            }
        }));
        console.log(`Dog ${dogId} status updated to ${status}`);
        return { success: true };
    }
    catch (error) {
        console.error('Error updating dog status:', error);
        return { success: false, error: error };
    }
};
exports.updateDogStatus = updateDogStatus;
