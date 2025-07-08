"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const APPLICATIONS_TABLE = process.env.APPLICATIONS_TABLE_NAME;
const DOGS_TABLE = process.env.DOGS_TABLE_NAME;
const handler = async (event) => {
    try {
        // Get all applications (no filtering by shelter)
        const result = await docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: APPLICATIONS_TABLE
        }));
        const applications = result.Items || [];
        // Fetch dog information for each application
        const applicationsWithDogInfo = await Promise.all(applications.map(async (app) => {
            try {
                const dogResult = await docClient.send(new lib_dynamodb_1.GetCommand({
                    TableName: DOGS_TABLE,
                    Key: { dogId: app.dogId }
                }));
                return {
                    ...app,
                    dogName: dogResult.Item?.name || dogResult.Item?.shelter || 'Unknown Dog'
                };
            }
            catch (error) {
                console.error(`Error fetching dog ${app.dogId}:`, error);
                return {
                    ...app,
                    dogName: 'Unknown Dog'
                };
            }
        }));
        console.log(`Retrieved ${applicationsWithDogInfo.length} total applications`);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            body: JSON.stringify({
                applications: applicationsWithDogInfo
            }),
        };
    }
    catch (error) {
        console.error('Error getting all applications:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
exports.handler = handler;
