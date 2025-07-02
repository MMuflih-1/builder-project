import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const VOTES_TABLE = process.env.VOTES_TABLE_NAME!;

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

    const { voteType, userId, isRemoving } = JSON.parse(event.body);
    
    if (!voteType || !['wag', 'growl'].includes(voteType)) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({ error: 'Vote type must be "wag" or "growl"' }),
      };
    }

    const finalUserId = userId || 'anonymous-user';
    
    console.log('Processing vote for userId:', finalUserId, 'isRemoving:', isRemoving);

    if (isRemoving) {
      // Remove the vote from database
      await docClient.send(new DeleteCommand({
        TableName: VOTES_TABLE,
        Key: {
          userId: finalUserId,
          dogId
        }
      }));
      
      console.log(`Vote removed for user ${finalUserId} on dog ${dogId}`);
    } else {
      // Add or update the vote
      const vote = {
        userId: finalUserId,
        dogId,
        voteType,
        timestamp: new Date().toISOString(),
      };

      await docClient.send(new PutCommand({
        TableName: VOTES_TABLE,
        Item: vote,
      }));
      
      console.log(`Vote recorded: ${voteType} for user ${finalUserId} on dog ${dogId}`);
    }

    return {
      statusCode: 201,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: JSON.stringify({ 
        message: 'Vote recorded successfully',
        vote: { dogId, voteType }
      }),
    };

  } catch (error) {
    console.error('Error recording vote:', error);
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