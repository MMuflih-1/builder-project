"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const DOGS_TABLE = process.env.DOGS_TABLE_NAME;
const handler = async (event) => {
    try {
        const queryParams = event.queryStringParameters || {};
        let command;
        // If state filter is provided, use GSI
        if (queryParams.state) {
            command = new lib_dynamodb_1.QueryCommand({
                TableName: DOGS_TABLE,
                IndexName: 'StateIndex',
                KeyConditionExpression: '#state = :state',
                ExpressionAttributeNames: {
                    '#state': 'state'
                },
                ExpressionAttributeValues: {
                    ':state': queryParams.state
                }
            });
        }
        else {
            // Otherwise scan the table
            command = new lib_dynamodb_1.ScanCommand({
                TableName: DOGS_TABLE,
                FilterExpression: '#species = :species',
                ExpressionAttributeNames: {
                    '#species': 'species'
                },
                ExpressionAttributeValues: {
                    ':species': 'Labrador Retriever'
                }
            });
        }
        const result = await docClient.send(command);
        let dogs = result.Items || [];
        // Apply additional filters
        if (queryParams.minWeight) {
            const minWeight = Number(queryParams.minWeight);
            dogs = dogs.filter(dog => dog.weight >= minWeight);
        }
        if (queryParams.maxWeight) {
            const maxWeight = Number(queryParams.maxWeight);
            dogs = dogs.filter(dog => dog.weight <= maxWeight);
        }
        if (queryParams.color) {
            dogs = dogs.filter(dog => dog.color.toLowerCase() === queryParams.color.toLowerCase());
        }
        if (queryParams.minAge || queryParams.maxAge) {
            const currentDate = new Date();
            dogs = dogs.filter(dog => {
                const birthDate = new Date(dog.birthday);
                const ageInYears = (currentDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
                if (queryParams.minAge && ageInYears < Number(queryParams.minAge))
                    return false;
                if (queryParams.maxAge && ageInYears > Number(queryParams.maxAge))
                    return false;
                return true;
            });
        }
        // Remove encrypted name from response (for privacy)
        const sanitizedDogs = dogs.map(dog => {
            const { encryptedName, ...publicDog } = dog;
            return publicDog;
        });
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            body: JSON.stringify({
                dogs: sanitizedDogs,
                count: sanitizedDogs.length
            }),
        };
    }
    catch (error) {
        console.error('Error fetching dogs:', error);
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
