import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const VOTES_TABLE = process.env.VOTES_TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
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

    await docClient.send(new PutCommand({
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

  } catch (error) {
    console.error('Error recording vote:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};