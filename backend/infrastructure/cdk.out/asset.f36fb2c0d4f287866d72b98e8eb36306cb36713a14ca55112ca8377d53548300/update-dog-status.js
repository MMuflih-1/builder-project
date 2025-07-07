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
        console.log(`Starting updateDogStatus for dog ${dogId} to status ${status}`);
        console.log('DOGS_TABLE:', DOGS_TABLE);
        const now = new Date().toISOString();
        const updateParams = {
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
        };
        console.log('Update params:', JSON.stringify(updateParams, null, 2));
        const result = await docClient.send(new lib_dynamodb_1.UpdateCommand(updateParams));
        console.log('DynamoDB update result:', result);
        console.log(`Dog ${dogId} status successfully updated to ${status}`);
        return { success: true };
    }
    catch (error) {
        console.error('Error updating dog status:', error);
        console.error('Full error details:', JSON.stringify(error, null, 2));
        return { success: false, error: error };
    }
};
exports.updateDogStatus = updateDogStatus;
