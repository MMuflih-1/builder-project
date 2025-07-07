"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const crypto = __importStar(require("crypto"));
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const APPLICATIONS_TABLE = process.env.APPLICATIONS_TABLE_NAME;
const handler = async (event) => {
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
                },
                body: JSON.stringify({ error: 'Request body is required' }),
            };
        }
        const applicationData = JSON.parse(event.body);
        // Validate required fields
        const requiredFields = ['dogId', 'shelter', 'name', 'email', 'phone', 'address', 'livingSpace', 'hasKids'];
        for (const field of requiredFields) {
            if (!applicationData[field]) {
                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
                    },
                    body: JSON.stringify({ error: `Missing required field: ${field}` }),
                };
            }
        }
        // Create application record
        const applicationId = crypto.randomUUID();
        const now = new Date().toISOString();
        const application = {
            applicationId,
            dogId: applicationData.dogId,
            shelter: applicationData.shelter,
            adopterId: applicationData.adopterId || 'anonymous-user',
            status: 'pending',
            // Adopter info
            adopterName: applicationData.name,
            adopterEmail: applicationData.email,
            adopterPhone: applicationData.phone,
            adopterAddress: applicationData.address,
            experience: applicationData.experience || '',
            livingSpace: applicationData.livingSpace,
            hasKids: applicationData.hasKids,
            createdAt: now,
            updatedAt: now
        };
        await docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: APPLICATIONS_TABLE,
            Item: application,
        }));
        console.log(`Adoption application ${applicationId} created for dog ${applicationData.dogId}`);
        return {
            statusCode: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            body: JSON.stringify({
                message: 'Adoption application submitted successfully',
                applicationId: applicationId
            }),
        };
    }
    catch (error) {
        console.error('Error submitting adoption application:', error);
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
