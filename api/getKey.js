export default function handler(req, res) {
  // Allow all requests in development
  if (process.env.NODE_ENV !== "production") {
    console.log("Development mode: Bypassing security checks");
    
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not set in environment");
      return res.status(500).json({ error: "API key not configured" });
    }
    
    return res.status(200).json({ apiKey: process.env.GEMINI_API_KEY });
  }
  
  // For production, check if this is a valid request
  const referer = req.headers.referer || "";
  const host = req.headers.host || "";
  
  // Log for debugging (will appear in Vercel logs)
  console.log(`Request from referer: ${referer}, host: ${host}`);
  
  // More permissive check - allow requests from the same host or vercel.app domains
  const isValidRequest = 
    host.includes('vercel.app') || 
    referer.includes('vercel.app') || 
    referer.includes(host) ||
    referer.includes('localhost');
  
  if (!isValidRequest) {
    console.warn(`Blocked request with referer: ${referer}, host: ${host}`);
    return res.status(403).json({ error: "Unauthorized request" });
  }
  
  // Return the API key from environment variable
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not set in environment");
    return res.status(500).json({ error: "API key not configured" });
  }
  
  return res.status(200).json({ apiKey: process.env.GEMINI_API_KEY });
}