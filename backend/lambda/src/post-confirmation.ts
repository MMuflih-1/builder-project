import { PostConfirmationTriggerEvent, PostConfirmationTriggerHandler } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({});

export const handler: PostConfirmationTriggerHandler = async (event: PostConfirmationTriggerEvent) => {
  console.log('Post-confirmation trigger event:', JSON.stringify(event, null, 2));

  try {
    const userPoolId = event.userPoolId;
    const username = event.userName;
    
    // Get the user_role from user attributes
    const userRole = event.request.userAttributes['custom:user_role'];
    
    console.log(`Assigning user ${username} to group: ${userRole}`);
    
    // Determine which group to assign based on user's choice
    let groupName = 'adopter'; // default
    if (userRole === 'shelter') {
      groupName = 'shelter';
    }
    
    // Add user to the appropriate group
    const addToGroupCommand = new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: username,
      GroupName: groupName,
    });
    
    await cognitoClient.send(addToGroupCommand);
    
    console.log(`Successfully added user ${username} to group ${groupName}`);
    
    return event;
    
  } catch (error) {
    console.error('Error in post-confirmation trigger:', error);
    // Don't throw error - we don't want to block user registration
    return event;
  }
};