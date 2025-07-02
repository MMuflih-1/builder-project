import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const DOGS_TABLE = process.env.DOGS_TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const dogId = event.pathParameters?.dogId;
    if (!dogId) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({ error: 'Dog ID is required' }),
      };
    }

    // Get the current user ID from request body
    const requestBody = event.body ? JSON.parse(event.body) : {};
    const currentUserId = requestBody.userId || 'anonymous-user';

    // First, get the dog to check ownership
    const getResult = await docClient.send(new GetCommand({
      TableName: DOGS_TABLE,
      Key: { dogId }
    }));

    if (!getResult.Item) {
      return {
        statusCode: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({ error: 'Dog not found' }),
      };
    }

    // Check if the current user created this dog
    if (getResult.Item.createdBy !== currentUserId) {
      return {
        statusCode: 403,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({ error: 'You can only delete dogs you posted' }),
      };
    }

    // Delete the dog
    await docClient.send(new DeleteCommand({
      TableName: DOGS_TABLE,
      Key: { dogId }
    }));

    console.log(`Dog ${dogId} deleted by user ${currentUserId}`);

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: JSON.stringify({ 
        message: 'Dog deleted successfully',
        dogId: dogId
      }),
    };

  } catch (error) {
    console.error('Error deleting dog:', error);
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