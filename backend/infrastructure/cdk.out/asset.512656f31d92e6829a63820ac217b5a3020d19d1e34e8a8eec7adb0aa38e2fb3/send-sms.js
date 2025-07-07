"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendApplicationStatusEmail = void 0;
const client_sns_1 = require("@aws-sdk/client-sns");
const snsClient = new client_sns_1.SNSClient({ region: 'us-east-2' });
const sendApplicationStatusEmail = async (emailData) => {
    const { email, dogName, shelter, status, applicantName } = emailData;
    console.log('Attempting to send email with data:', emailData);
    const subject = status === 'approved'
        ? `🎉 Your adoption application for ${dogName} has been approved!`
        : `Application Update for ${dogName}`;
    const message = status === 'approved'
        ? `Congratulations ${applicantName}!\n\nGreat news! Your adoption application for ${dogName} from ${shelter} has been APPROVED!\n\nNext Steps:\n- The shelter will contact you directly within 24-48 hours\n- They will arrange a meet-and-greet with ${dogName}\n- Complete any remaining paperwork\n- Prepare your home for your new family member!\n\nThank you for choosing to adopt. ${dogName} is lucky to have found such a caring family!\n\nBest regards,\nThe Pupper Adoption Team`
        : `Hello ${applicantName},\n\nThank you for your interest in adopting ${dogName} from ${shelter}.\n\nAfter careful consideration, we regret to inform you that your application was not selected at this time. This decision was difficult as we received many wonderful applications.\n\nPlease don't be discouraged! There are many other dogs looking for loving homes. We encourage you to:\n- Browse other available dogs on our platform\n- Consider applying for other dogs that might be a great match\n- Keep checking back as new dogs are added regularly\n\nThank you for your commitment to pet adoption.\n\nBest regards,\nThe Pupper Adoption Team`;
    // Create a temporary subscription and publish
    const topicArn = process.env.SNS_TOPIC_ARN || 'arn:aws:sns:us-east-2:123456789012:adoption-notifications';
    const params = {
        TopicArn: topicArn,
        Subject: subject,
        Message: message
    };
    console.log('Email params:', JSON.stringify(params, null, 2));
    try {
        const result = await snsClient.send(new client_sns_1.PublishCommand(params));
        console.log('Email sent successfully:', result.MessageId);
        return { success: true, messageId: result.MessageId };
    }
    catch (error) {
        console.error('Error sending email:', error);
        console.error('Full error details:', JSON.stringify(error, null, 2));
        return { success: false, error: error };
    }
};
exports.sendApplicationStatusEmail = sendApplicationStatusEmail;
