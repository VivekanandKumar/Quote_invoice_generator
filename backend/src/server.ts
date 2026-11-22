import { app } from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` Quote & Invoice Backend API Server Started    `);
  console.log(` Local URL: http://localhost:${PORT}           `);
  console.log(` Health:    http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);
});
