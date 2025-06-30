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
// Using Node.js built-in UUID
const crypto = __importStar(require("crypto"));
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const DOGS_TABLE = process.env.DOGS_TABLE_NAME;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
function encryptName(name) {
    const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
    let encrypted = cipher.update(name, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}
const handler = async (event) => {
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Request body is required' }),
            };
        }
        const dogData = JSON.parse(event.body);
        // Validate required fields
        const requiredFields = ['shelter', 'city', 'state', 'name', 'species', 'description', 'birthday', 'weight', 'color'];
        for (const field of requiredFields) {
            if (!dogData[field]) {
                return {
                    statusCode: 400,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: `Missing required field: ${field}` }),
                };
            }
        }
        // Validate species (only Labrador Retrievers allowed)
        if (dogData.species.toLowerCase() !== 'labrador retriever') {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Only Labrador Retrievers are allowed' }),
            };
        }
        // Create dog record
        const dogId = crypto.randomUUID();
        const now = new Date().toISOString();
        const dog = {
            dogId,
            encryptedName: encryptName(dogData.name),
            shelter: dogData.shelter,
            city: dogData.city,
            state: dogData.state,
            species: dogData.species,
            description: dogData.description,
            birthday: dogData.birthday,
            weight: Number(dogData.weight),
            color: dogData.color,
            entryDate: dogData.entryDate || now,
            createdAt: now,
        };
        await docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: DOGS_TABLE,
            Item: dog,
        }));
        return {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Dog created successfully',
                dogId: dogId
            }),
        };
    }
    catch (error) {
        console.error('Error creating dog:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
exports.handler = handler;
