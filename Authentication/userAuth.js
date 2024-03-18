import jwt from "jsonwebtoken";

export function isAuthenticated(req, res, next) {
  const token = req.headers["x-auth-token"];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" }); 
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded; 
    next();
  } catch (err) {
    console.error("JWT verification error:", err);
    res.status(403).json({ message: "Forbidden" });
  }
}
