"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendApplicationStatusEmail = void 0;
const client_ses_1 = require("@aws-sdk/client-ses");
const sesClient = new client_ses_1.SESClient({ region: 'us-east-2' });
const sendApplicationStatusEmail = async (emailData) => {
    const { to, dogName, shelter, status, applicantName } = emailData;
    const subject = status === 'approved'
        ? `🎉 Your adoption application for ${dogName} has been approved!`
        : `Application Update for ${dogName}`;
    const htmlBody = status === 'approved'
        ? `
      <h2>Congratulations ${applicantName}!</h2>
      <p>Great news! Your adoption application for <strong>${dogName}</strong> from <strong>${shelter}</strong> has been <span style="color: green; font-weight: bold;">APPROVED</span>!</p>
      
      <h3>Next Steps:</h3>
      <ul>
        <li>The shelter will contact you directly within 24-48 hours</li>
        <li>They will arrange a meet-and-greet with ${dogName}</li>
        <li>Complete any remaining paperwork</li>
        <li>Prepare your home for your new family member!</li>
      </ul>
      
      <p>Thank you for choosing to adopt. ${dogName} is lucky to have found such a caring family!</p>
      
      <p>Best regards,<br>The Pupper Adoption Team</p>
    `
        : `
      <h2>Hello ${applicantName},</h2>
      <p>Thank you for your interest in adopting <strong>${dogName}</strong> from <strong>${shelter}</strong>.</p>
      
      <p>After careful consideration, we regret to inform you that your application was not selected at this time. This decision was difficult as we received many wonderful applications.</p>
      
      <p>Please don't be discouraged! There are many other dogs looking for loving homes. We encourage you to:</p>
      <ul>
        <li>Browse other available dogs on our platform</li>
        <li>Consider applying for other dogs that might be a great match</li>
        <li>Keep checking back as new dogs are added regularly</li>
      </ul>
      
      <p>Thank you for your commitment to pet adoption.</p>
      
      <p>Best regards,<br>The Pupper Adoption Team</p>
    `;
    const textBody = status === 'approved'
        ? `Congratulations ${applicantName}! Your adoption application for ${dogName} from ${shelter} has been APPROVED! The shelter will contact you within 24-48 hours to arrange next steps.`
        : `Hello ${applicantName}, Thank you for your interest in ${dogName} from ${shelter}. Unfortunately, your application was not selected at this time. Please consider applying for other available dogs.`;
    const params = {
        Source: 'orca25100@gmail.com',
        Destination: {
            ToAddresses: [to],
        },
        Message: {
            Subject: {
                Data: subject,
                Charset: 'UTF-8',
            },
            Body: {
                Html: {
                    Data: htmlBody,
                    Charset: 'UTF-8',
                },
                Text: {
                    Data: textBody,
                    Charset: 'UTF-8',
                },
            },
        },
    };
    try {
        const result = await sesClient.send(new client_ses_1.SendEmailCommand(params));
        console.log('Email sent successfully:', result.MessageId);
        return { success: true, messageId: result.MessageId };
    }
    catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error };
    }
};
exports.sendApplicationStatusEmail = sendApplicationStatusEmail;
