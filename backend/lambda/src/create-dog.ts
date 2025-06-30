import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
// Using Node.js built-in UUID
import * as crypto from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const DOGS_TABLE = process.env.DOGS_TABLE_NAME!;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

function encryptName(name: string): string {
  // Simple base64 encoding for demo (use proper encryption in production)
  return Buffer.from(name).toString('base64');
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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

    await docClient.send(new PutCommand({
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

  } catch (error) {
    console.error('Error creating dog:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};