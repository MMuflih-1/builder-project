import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const APPLICATIONS_TABLE = process.env.APPLICATIONS_TABLE_NAME!;
const DOGS_TABLE = process.env.DOGS_TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const shelterUserId = event.pathParameters?.userId;
    if (!shelterUserId) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({ error: 'User ID is required' }),
      };
    }

    // Get all applications
    const result = await docClient.send(new ScanCommand({
      TableName: APPLICATIONS_TABLE
    }));

    const applications = result.Items || [];
    
    // Fetch dog information for each application
    const applicationsWithDogInfo = await Promise.all(
      applications.map(async (app) => {
        try {
          const dogResult = await docClient.send(new GetCommand({
            TableName: DOGS_TABLE,
            Key: { dogId: app.dogId }
          }));
          
          return {
            ...app,
            dogName: dogResult.Item?.name || dogResult.Item?.shelter || 'Unknown Dog',
            dogCreatedBy: dogResult.Item?.createdBy || 'unknown'
          };
        } catch (error) {
          console.error(`Error fetching dog ${app.dogId}:`, error);
          return {
            ...app,
            dogName: 'Unknown Dog',
            dogCreatedBy: 'unknown'
          };
        }
      })
    );
    
    // Filter applications to only show those for dogs created by this shelter user
    const filteredApplications = applicationsWithDogInfo.filter(app => app.dogCreatedBy === shelterUserId);
    
    console.log(`Retrieved ${filteredApplications.length} applications for shelter user ${shelterUserId}`);

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: JSON.stringify({ 
        applications: filteredApplications
      }),
    };

  } catch (error) {
    console.error('Error getting applications:', error);
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