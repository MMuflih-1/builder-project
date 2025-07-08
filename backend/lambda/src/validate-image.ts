import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RekognitionClient, DetectLabelsCommand } from '@aws-sdk/client-rekognition';

const rekognitionClient = new RekognitionClient({});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { imageBase64 } = body;

    if (!imageBase64) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
        body: JSON.stringify({ error: 'Image data is required' }),
      };
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // Use Rekognition to detect labels
    const detectLabelsCommand = new DetectLabelsCommand({
      Image: {
        Bytes: imageBuffer,
      },
      MaxLabels: 20,
      MinConfidence: 70,
    });

    const rekognitionResponse = await rekognitionClient.send(detectLabelsCommand);
    const labels = rekognitionResponse.Labels || [];

    console.log('Detected labels:', labels.map(l => `${l.Name}: ${l.Confidence}%`));

    // Check for non-dog animals first (strict rejection)
    const nonDogAnimals = ['Elephant', 'Cat', 'Horse', 'Cow', 'Lion', 'Tiger', 'Bear', 'Bird', 'Fish', 'Snake', 'Rabbit', 'Hamster', 'Guinea Pig', 'Ferret', 'Reptile', 'Lizard', 'Turtle', 'Frog', 'Monkey', 'Ape', 'Deer', 'Sheep', 'Goat', 'Pig', 'Chicken', 'Duck', 'Goose'];
    const hasNonDogAnimal = labels.some(label => 
      nonDogAnimals.some(animal => 
        label.Name?.toLowerCase().includes(animal.toLowerCase())
      ) && (label.Confidence || 0) > 60
    );

    if (hasNonDogAnimal) {
      const detectedAnimal = labels.find(label => 
        nonDogAnimals.some(animal => 
          label.Name?.toLowerCase().includes(animal.toLowerCase())
        ) && (label.Confidence || 0) > 60
      );
      
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
        body: JSON.stringify({ 
          error: `Only labrador retriever dogs are accepted for adoption. This image appears to contain a ${detectedAnimal?.Name?.toLowerCase()}.`,
          isValid: false 
        }),
      };
    }

    // Check for specific non-Labrador dog breeds
    const nonLabradorBreeds = ['German Shepherd', 'Bulldog', 'Poodle', 'Chihuahua', 'Beagle', 'Rottweiler', 'Yorkshire Terrier', 'Dachshund', 'Siberian Husky', 'Shih Tzu', 'Border Collie', 'Boxer', 'Cocker Spaniel'];
    const hasNonLabradorBreed = labels.some(label => 
      nonLabradorBreeds.some(breed => 
        label.Name?.toLowerCase().includes(breed.toLowerCase())
      ) && (label.Confidence || 0) > 75
    );

    if (hasNonLabradorBreed) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
        body: JSON.stringify({ 
          error: 'Only Labrador Retrievers are accepted. This image appears to contain a different dog breed.',
          isValid: false 
        }),
      };
    }

    // Check for dog-related labels (must have at least one)
    const dogLabels = ['Dog', 'Canine', 'Labrador Retriever', 'Golden Retriever', 'Retriever'];
    const hasDogIndicators = labels.some(label => 
      dogLabels.some(dogLabel => 
        label.Name?.toLowerCase().includes(dogLabel.toLowerCase())
      ) && (label.Confidence || 0) > 70
    );

    if (!hasDogIndicators) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
        },
        body: JSON.stringify({ 
          error: 'Please upload an image of a dog. This image does not appear to contain a dog.',
          isValid: false 
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ 
        message: 'Image validation passed',
        isValid: true 
      }),
    };

  } catch (error) {
    console.error('Error validating image:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ error: 'Failed to validate image' }),
    };
  }
};