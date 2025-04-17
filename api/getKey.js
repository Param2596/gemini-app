export default function handler(req, res) {
  // Add basic security check to prevent unauthorized access
  const referer = req.headers.referer || "";
  
  // Only allow requests from your own domain when deployed
  if (process.env.NODE_ENV === "production" && 
      !referer.includes(process.env.VERCEL_URL) && 
      !referer.includes("localhost")) {
    return res.status(403).json({ error: "Unauthorized" });
  }
  
  // Return the API key from environment variable
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not set in environment");
    return res.status(500).json({ error: "API key not configured" });
  }
  
  return res.status(200).json({ apiKey: process.env.GEMINI_API_KEY });
}