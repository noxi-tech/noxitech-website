exports.handler = async (event) => {
  try {
    let accessToken;

    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body);
      accessToken = data.accessToken;
    }

    if (!accessToken) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "No access token provided." }),
      };
    }

    const webhookUrl = process.env.VERIFY_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("VERIFY_WEBHOOK_URL is not defined");
      // Default to allowing the form if we can't verify (or change to fail-shut)
      return {
        statusCode: 200,
        body: JSON.stringify({ completed: false }),
      };
    }

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken,
        timestamp: new Date().toISOString(),
        event: "verification_attempt"
      }),
    });

    // 1. User doesn't exist / Invalid Token
    if (webhookResponse.status === 404 || webhookResponse.status === 401) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "This access token is invalid or has expired." }),
      };
    }

    const webhookText = await webhookResponse.text();

    if (!webhookResponse.ok) {
      throw new Error(`Webhook responded with status ${webhookResponse.status}: ${webhookText}`);
    }

    let result;
    try {
      result = JSON.parse(webhookText);
    } catch (e) {
      console.error("Failed to parse webhook JSON:", webhookText);
      // If it's not JSON, we can't determine 'completed' status, so we might default or fail
      throw new Error("Webhook did not return valid JSON. Check your n8n workflow response node.");
    }

    // 2. User exists. Check if they already filled the form
    return {
      statusCode: 200,
      body: JSON.stringify({
        completed: result && result.completed === true,
        message: "Success"
      }),
    };

  } catch (error) {
    console.error("Verification error detail:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "A server error occurred during verification.",
        error: error.message // Sharing error message temporarily for easier debugging
      }),
    };
  }
};
