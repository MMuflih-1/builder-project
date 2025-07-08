"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_rekognition_1 = require("@aws-sdk/client-rekognition");
const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
const rekognitionClient = new client_rekognition_1.RekognitionClient({});
const DOGS_TABLE = process.env.DOGS_TABLE_NAME;
const handler = async (event) => {
    for (const record of event.Records) {
        try {
            const bucket = record.s3.bucket.name;
            const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
            // Skip if already processed (avoid infinite loops)
            if (key.includes('resized-') || key.includes('thumbnail-')) {
                continue;
            }
            console.log(`Processing image: ${key}`);
            // Extract dogId from filename (format: uuid-original.jpg)
            // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-original.jpg
            const parts = key.split('-');
            let dogId;
            if (parts.length >= 6 && parts[5].startsWith('original')) {
                // Reconstruct full UUID (first 5 parts)
                dogId = parts.slice(0, 5).join('-');
                console.log(`Extracted dogId: ${dogId} from key: ${key}`);
            }
            else {
                console.error(`Invalid filename format: ${key}`);
                continue;
            }
            // Use Rekognition to detect if image contains a Labrador Retriever
            console.log('Starting breed detection with Rekognition');
            const detectLabelsCommand = new client_rekognition_1.DetectLabelsCommand({
                Image: {
                    S3Object: {
                        Bucket: bucket,
                        Name: key,
                    },
                },
                MaxLabels: 20,
                MinConfidence: 70,
            });
            const rekognitionResponse = await rekognitionClient.send(detectLabelsCommand);
            const labels = rekognitionResponse.Labels || [];
            console.log('Detected labels:', labels.map(l => `${l.Name}: ${l.Confidence}%`));
            // Check for non-dog animals first (strict rejection)
            const nonDogAnimals = ['Elephant', 'Cat', 'Horse', 'Cow', 'Lion', 'Tiger', 'Bear', 'Bird', 'Fish', 'Snake', 'Rabbit', 'Hamster', 'Guinea Pig', 'Ferret', 'Reptile', 'Lizard', 'Turtle', 'Frog', 'Monkey', 'Ape', 'Deer', 'Sheep', 'Goat', 'Pig', 'Chicken', 'Duck', 'Goose'];
            const hasNonDogAnimal = labels.some(label => nonDogAnimals.some(animal => label.Name?.toLowerCase().includes(animal.toLowerCase())) && (label.Confidence || 0) > 60);
            // Check for specific non-Labrador dog breeds
            const nonLabradorBreeds = ['German Shepherd', 'Bulldog', 'Poodle', 'Chihuahua', 'Beagle', 'Rottweiler', 'Yorkshire Terrier', 'Dachshund', 'Siberian Husky', 'Shih Tzu', 'Border Collie', 'Boxer', 'Cocker Spaniel'];
            const hasNonLabradorBreed = labels.some(label => nonLabradorBreeds.some(breed => label.Name?.toLowerCase().includes(breed.toLowerCase())) && (label.Confidence || 0) > 75);
            // Check for dog-related labels (must have at least one)
            const dogLabels = ['Dog', 'Canine', 'Labrador Retriever', 'Golden Retriever', 'Retriever'];
            const hasDogIndicators = labels.some(label => dogLabels.some(dogLabel => label.Name?.toLowerCase().includes(dogLabel.toLowerCase())) && (label.Confidence || 0) > 70);
            if (hasNonDogAnimal || hasNonLabradorBreed || !hasDogIndicators) {
                console.log('Image rejected: Not a Labrador Retriever, contains non-dog animal, or not a dog');
                // Delete the dog record from DynamoDB
                try {
                    await docClient.send(new lib_dynamodb_1.DeleteCommand({
                        TableName: DOGS_TABLE,
                        Key: { dogId }
                    }));
                    console.log(`Deleted dog record for rejected image: ${dogId}`);
                }
                catch (deleteError) {
                    console.error('Error deleting rejected dog record:', deleteError);
                }
                // Skip further processing
                continue;
            }
            console.log('Image approved: Appears to be a valid dog image');
            // For now, just use the original image for all sizes
            // In production, you'd want proper image resizing
            const baseUrl = `https://${bucket}.s3.amazonaws.com`;
            console.log(`Updating DynamoDB for dogId: ${dogId}`);
            try {
                await docClient.send(new lib_dynamodb_1.UpdateCommand({
                    TableName: DOGS_TABLE,
                    Key: { dogId },
                    UpdateExpression: 'SET originalImageUrl = :original, resizedImageUrl = :resized, thumbnailUrl = :thumbnail',
                    ExpressionAttributeValues: {
                        ':original': `${baseUrl}/${key}`,
                        ':resized': `${baseUrl}/${key}`,
                        ':thumbnail': `${baseUrl}/${key}`, // Using original for now
                    },
                    ReturnValues: 'ALL_NEW'
                }));
                console.log(`Successfully updated DynamoDB for dogId: ${dogId}`);
            }
            catch (dbError) {
                console.error(`Failed to update DynamoDB for dogId: ${dogId}`, dbError);
                throw dbError;
            }
            console.log(`Successfully processed image for dog: ${dogId}`);
        }
        catch (error) {
            console.error('Error processing image:', error);
            throw error;
        }
    }
};
exports.handler = handler;
