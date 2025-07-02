import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const VOTES_TABLE = process.env.VOTES_TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Get userId from path parameters or use anonymous for now
    const userId = event.pathParameters?.userId || 'anonymous-user';

    console.log(`Fetching votes for userId: ${userId}`);

    // Query votes for this user
    const command = new QueryCommand({
      TableName: VOTES_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    });

    const result = await docClient.send(command);
    const votes = result.Items || [];

    // Convert to format expected by frontend: { dogId: voteType }
    const userVotes: Record<string, string> = {};
    votes.forEach(vote => {
      userVotes[vote.dogId] = vote.voteType;
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
        userId,
        votes: userVotes,
        count: votes.length
      }),
    };

  } catch (error) {
    console.error('Error fetching user votes:', error);
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