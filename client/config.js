export const API_URL = import.meta.env.MODE === 'production' 
  ? 'https://your-backend-service.com' 
  : 'http://localhost:5173';