"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const bedrockClient = new client_bedrock_runtime_1.BedrockRuntimeClient({ region: 'us-east-2' });
const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
const DOGS_TABLE = process.env.DOGS_TABLE_NAME;
const handler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { userPreferences } = body;
        if (!userPreferences) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                },
                body: JSON.stringify({ error: 'User preferences are required' }),
            };
        }
        // Get all available dogs
        const scanCommand = new lib_dynamodb_1.ScanCommand({
            TableName: DOGS_TABLE,
            FilterExpression: '#status <> :adopted',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':adopted': 'adopted'
            }
        });
        const dogsResult = await docClient.send(scanCommand);
        const availableDogs = dogsResult.Items || [];
        if (availableDogs.length === 0) {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                },
                body: JSON.stringify({
                    recommendation: 'No dogs are currently available for adoption.',
                    recommendedDog: null
                }),
            };
        }
        // Create dog summaries for the LLM
        const dogSummaries = availableDogs.map(dog => ({
            id: dog.dogId,
            name: dog.name || 'Unnamed',
            age: calculateAge(dog.birthday),
            weight: dog.weight,
            color: dog.color,
            description: dog.description,
            location: `${dog.city}, ${dog.state}`,
            shelter: dog.shelter
        }));
        // Create prompt for LLM
        const prompt = `You are a dog adoption expert. Based on the user's preferences and the available dogs, recommend the best match.

User Preferences: ${userPreferences}

Available Dogs:
${dogSummaries.map(dog => `- ${dog.name} (ID: ${dog.id}): ${dog.age} old, ${dog.weight} lbs, ${dog.color} color, located in ${dog.location}. Description: ${dog.description}`).join('\n')}

Please recommend the best dog for this user and explain why. Respond in JSON format:
{
  "recommendedDogId": "dog-id-here",
  "explanation": "Brief explanation of why this dog is the best match"
}`;
        // Call Bedrock LLM
        const modelId = 'anthropic.claude-3-haiku-20240307-v1:0';
        const input = {
            modelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 500,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            }),
        };
        const command = new client_bedrock_runtime_1.InvokeModelCommand(input);
        const response = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const llmResponse = responseBody.content[0].text;
        // Parse LLM response
        let recommendation;
        try {
            recommendation = JSON.parse(llmResponse);
        }
        catch {
            // Fallback if JSON parsing fails
            recommendation = {
                recommendedDogId: availableDogs[0].dogId,
                explanation: 'Based on your preferences, here is a great dog for you!'
            };
        }
        // Find the recommended dog
        const recommendedDog = availableDogs.find(dog => dog.dogId === recommendation.recommendedDogId);
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
            },
            body: JSON.stringify({
                recommendation: recommendation.explanation,
                recommendedDog: recommendedDog || availableDogs[0]
            }),
        };
    }
    catch (error) {
        console.error('Error getting dog recommendation:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
            },
            body: JSON.stringify({ error: 'Failed to get dog recommendation' }),
        };
    }
};
exports.handler = handler;
function calculateAge(birthday) {
    const birthDate = new Date(birthday);
    const today = new Date();
    const diffTime = today.getTime() - birthDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 30) {
        return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
    }
    else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} ${months === 1 ? 'month' : 'months'}`;
    }
    else {
        const years = Math.floor(diffDays / 365);
        return `${years} ${years === 1 ? 'year' : 'years'}`;
    }
}
