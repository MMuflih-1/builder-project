"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_rekognition_1 = require("@aws-sdk/client-rekognition");
const rekognitionClient = new client_rekognition_1.RekognitionClient({});
const handler = async (event) => {
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
        const detectLabelsCommand = new client_rekognition_1.DetectLabelsCommand({
            Image: {
                Bytes: imageBuffer,
            },
            MaxLabels: 20,
            MinConfidence: 70,
        });
        const rekognitionResponse = await rekognitionClient.send(detectLabelsCommand);
        const labels = rekognitionResponse.Labels || [];
        console.log('Detected labels:', labels.map(l => `${l.Name}: ${l.Confidence}%`));
        // Check for dog-related labels
        const dogLabels = ['Dog', 'Pet', 'Animal', 'Canine', 'Labrador Retriever', 'Golden Retriever'];
        const hasDogIndicators = labels.some(label => dogLabels.some(dogLabel => label.Name?.toLowerCase().includes(dogLabel.toLowerCase())) && (label.Confidence || 0) > 70);
        // Check for non-Labrador breeds
        const nonLabradorBreeds = ['German Shepherd', 'Bulldog', 'Poodle', 'Chihuahua', 'Beagle', 'Rottweiler', 'Yorkshire Terrier', 'Dachshund', 'Siberian Husky', 'Shih Tzu'];
        const hasNonLabradorBreed = labels.some(label => nonLabradorBreeds.some(breed => label.Name?.toLowerCase().includes(breed.toLowerCase())) && (label.Confidence || 0) > 75);
        if (hasNonLabradorBreed) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                },
                body: JSON.stringify({
                    error: 'Only Labrador Retrievers are accepted. This image appears to contain a different breed.',
                    isValid: false
                }),
            };
        }
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
    }
    catch (error) {
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
exports.handler = handler;
