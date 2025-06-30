"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const VOTES_TABLE = process.env.VOTES_TABLE_NAME;
const handler = async (event) => {
    try {
        const dogId = event.pathParameters?.dogId;
        if (!dogId) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Dog ID is required' }),
            };
        }
        if (!event.body) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Request body is required' }),
            };
        }
        const { voteType } = JSON.parse(event.body);
        if (!voteType || !['wag', 'growl'].includes(voteType)) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Vote type must be "wag" or "growl"' }),
            };
        }
        // Get userId from Cognito (will be added when we integrate API Gateway with Cognito)
        const userId = event.requestContext.authorizer?.claims?.sub || 'anonymous-user';
        const vote = {
            userId,
            dogId,
            voteType,
            timestamp: new Date().toISOString(),
        };
        await docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: VOTES_TABLE,
            Item: vote,
        }));
        return {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Vote recorded successfully',
                vote: { dogId, voteType }
            }),
        };
    }
    catch (error) {
        console.error('Error recording vote:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
exports.handler = handler;
