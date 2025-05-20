// src/api/start-server.ts
import app from './server.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  console.log(`Access the API at http://localhost:${PORT}/api`);
});
