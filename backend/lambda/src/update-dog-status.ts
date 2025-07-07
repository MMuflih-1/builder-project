import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const DOGS_TABLE = process.env.DOGS_TABLE_NAME!;

export const updateDogStatus = async (dogId: string, status: 'available' | 'adopted') => {
  try {
    console.log(`Starting updateDogStatus for dog ${dogId} to status ${status}`);
    console.log('DOGS_TABLE:', DOGS_TABLE);
    
    const now = new Date().toISOString();
    
    const updateParams = {
      TableName: DOGS_TABLE,
      Key: { dogId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': now
      }
    };
    
    console.log('Update params:', JSON.stringify(updateParams, null, 2));
    
    const result = await docClient.send(new UpdateCommand(updateParams));
    
    console.log('DynamoDB update result:', result);
    console.log(`Dog ${dogId} status successfully updated to ${status}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating dog status:', error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
    return { success: false, error: error };
  }
};