export const handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { id, problem, annualRevenue, hoursLost, isDecisionMaker, decisionMakerName, companyName, companyDomain } = data;

    // Server-side Honeypot check
    if (data['bot-field']) {
      console.warn("Audit spam detected and blocked:", data);
      return {
        statusCode: 200, // Return 200 to trick the bot into thinking it worked
        body: JSON.stringify({ message: "Success" }),
      };
    }

    // Basic validation
    if (!id || !problem || !annualRevenue || !hoursLost || !isDecisionMaker || !companyName || (isDecisionMaker === 'no' && !decisionMakerName)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields (including audit ID)" }),
      };
    }

    // Process the data by sending it to a webhook
    const webhookUrl = process.env.AUDIT_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error("AUDIT_WEBHOOK_URL is not defined");
      // Still return 200 to the user but log the error for the developer
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Success (Logged internally)" }),
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
          source: "Noxitech Audit Form",
          auditId: id
        }),
      });

      if (!webhookResponse.ok) {
        console.error(`Webhook Error Status: ${webhookResponse.status} - ${webhookResponse.statusText}`);
        throw new Error(`Webhook responded with status: ${webhookResponse.status}`);
      }

    } catch (error) {
      console.error("Detailed Audit Webhook Error:", error.message);
      // We still return 200 to the user to avoid scaring them
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Success" }),
    };
  } catch (error) {
    console.error("Error processing audit submission:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
