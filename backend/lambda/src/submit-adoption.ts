import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import * as crypto from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const APPLICATIONS_TABLE = process.env.APPLICATIONS_TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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

    await docClient.send(new PutCommand({
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

  } catch (error) {
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