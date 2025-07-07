import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { sendApplicationStatusEmail } from './send-email';
import { updateDogStatus } from './update-dog-status';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const APPLICATIONS_TABLE = process.env.APPLICATIONS_TABLE_NAME!;
const DOGS_TABLE = process.env.DOGS_TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const applicationId = event.pathParameters?.applicationId;
    if (!applicationId) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({ error: 'Application ID is required' }),
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

    const { status, userId } = JSON.parse(event.body);
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return {
        statusCode: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({ error: 'Status must be "approved" or "rejected"' }),
      };
    }

    // Get the application to verify it exists
    const getResult = await docClient.send(new GetCommand({
      TableName: APPLICATIONS_TABLE,
      Key: { applicationId }
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
        body: JSON.stringify({ error: 'Application not found' }),
      };
    }

    // Update the application status
    const now = new Date().toISOString();
    await docClient.send(new UpdateCommand({
      TableName: APPLICATIONS_TABLE,
      Key: { applicationId },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': now
      }
    }));

    console.log(`Application ${applicationId} ${status} by user ${userId}`);

    // Send email notification
    try {
      console.log('Starting email notification process...');
      console.log('Application data:', getResult.Item);
      
      // Get dog information for email
      const dogResult = await docClient.send(new GetCommand({
        TableName: DOGS_TABLE,
        Key: { dogId: getResult.Item.dogId }
      }));
      
      console.log('Dog data:', dogResult.Item);
      
      const dogName = dogResult.Item?.name || dogResult.Item?.shelter || 'Unknown Dog';
      const shelter = getResult.Item.shelter;
      
      const emailData = {
        email: getResult.Item.adopterEmail,
        dogName: dogName,
        shelter: shelter,
        status: status as 'approved' | 'rejected',
        applicantName: getResult.Item.adopterName
      };
      
      console.log('Calling sendApplicationStatusEmail with:', emailData);
      
      const emailResult = await sendApplicationStatusEmail(emailData);
      
      console.log('Email result:', emailResult);
      console.log(`Email notification sent to ${getResult.Item.adopterEmail}`);
      
      // Update dog status to adopted if application was approved
      if (status === 'approved') {
        console.log('Application approved - marking dog as adopted');
        console.log('Dog ID to update:', getResult.Item.dogId);
        
        try {
          const dogStatusResult = await updateDogStatus(getResult.Item.dogId, 'adopted');
          console.log('Dog status update result:', dogStatusResult);
        } catch (dogUpdateError) {
          console.error('Error updating dog status:', dogUpdateError);
        }
      } else {
        console.log('Application not approved, status is:', status);
      }
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
      console.error('Full email error:', JSON.stringify(emailError, null, 2));
      // Don't fail the whole operation if email fails
    }

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: JSON.stringify({ 
        message: `Application ${status} successfully`,
        applicationId: applicationId,
        status: status
      }),
    };

  } catch (error) {
    console.error('Error updating application:', error);
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