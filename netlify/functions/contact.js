exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { firstName, lastName, email, message, reason } = data;

    // Server-side Honeypot check
    if (data['bot-field']) {
      console.warn("Spam detected and blocked:", data);
      return {
        statusCode: 200, // Return 200 to trick the bot into thinking it worked
        body: JSON.stringify({ message: "Success" }),
      };
    }

    // Basic validation
    if (!firstName || !lastName || !email || !reason || (reason !== 'audit' && !message)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields" }),
      };
    }

    // Process the data by sending it to a webhook
    const webhookUrl = process.env.CONTACT_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error("webhookUrl is not defined");
      // Still return 200 to the user but log the error for the developer
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Success" }),
      };
    }

    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          timestamp: new Date().toISOString(),
          source: "Noxitech Contact Form",
        }),
      });

      if (!webhookResponse.ok) {
        throw new Error(`Webhook responded with status: ${webhookResponse.status}`);
      }
    } catch (error) {
      console.error("Error sending to webhook:", error);
      // We still return 200 to the user to avoid scaring them,
      // as the user's primary goal (submitting) was achieved locally.
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Success" }),
    };
  } catch (error) {
    console.error("Error processing formulation:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
