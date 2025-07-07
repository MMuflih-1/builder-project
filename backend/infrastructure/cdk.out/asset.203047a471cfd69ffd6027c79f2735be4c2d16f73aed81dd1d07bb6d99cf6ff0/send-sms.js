"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendApplicationStatusSMS = void 0;
const client_sns_1 = require("@aws-sdk/client-sns");
const snsClient = new client_sns_1.SNSClient({ region: 'us-east-2' });
const sendApplicationStatusSMS = async (smsData) => {
    const { phoneNumber, dogName, shelter, status, applicantName } = smsData;
    console.log('Attempting to send SMS with data:', smsData);
    const message = status === 'approved'
        ? `🎉 GREAT NEWS ${applicantName}! Your adoption application for ${dogName} from ${shelter} has been APPROVED! The shelter will contact you within 24-48 hours. - Pupper Adoption Team`
        : `Hello ${applicantName}, Thank you for your interest in ${dogName} from ${shelter}. Unfortunately, your application was not selected this time. Please consider other available dogs. - Pupper Adoption Team`;
    const params = {
        PhoneNumber: phoneNumber,
        Message: message
    };
    console.log('SMS params:', JSON.stringify(params, null, 2));
    try {
        const result = await snsClient.send(new client_sns_1.PublishCommand(params));
        console.log('SMS sent successfully:', result.MessageId);
        return { success: true, messageId: result.MessageId };
    }
    catch (error) {
        console.error('Error sending SMS:', error);
        console.error('Full error details:', JSON.stringify(error, null, 2));
        return { success: false, error: error };
    }
};
exports.sendApplicationStatusSMS = sendApplicationStatusSMS;
