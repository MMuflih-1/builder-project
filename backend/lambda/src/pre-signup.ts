import { PreSignUpTriggerEvent, PreSignUpTriggerHandler } from 'aws-lambda';

export const handler: PreSignUpTriggerHandler = async (event: PreSignUpTriggerEvent) => {
  console.log('Pre-signup trigger event:', JSON.stringify(event, null, 2));

  try {
    // Get the user_role from user attributes
    const userRole = event.request.userAttributes['custom:user_role'];
    
    console.log(`Validating user role: ${userRole}`);
    
    // Validate that user_role is either 'adopter' or 'shelter'
    if (!userRole || (userRole.toLowerCase() !== 'adopter' && userRole.toLowerCase() !== 'shelter')) {
      console.log(`Invalid user role: ${userRole}. Must be 'adopter' or 'shelter'`);
      throw new Error('Invalid role. Please enter either "adopter" or "shelter".');
    }
    
    // Normalize the role to lowercase
    event.request.userAttributes['custom:user_role'] = userRole.toLowerCase();
    
    console.log(`User role validated successfully: ${userRole.toLowerCase()}`);
    
    return event;
    
  } catch (error) {
    console.error('Error in pre-signup trigger:', error);
    // Throw error to prevent signup
    throw error;
  }
};