const db = require('./your-db-config');
const { updateReportPrediction } = require('./prediction-service');

// Run every hour
setInterval(async () => {
  console.log('Running prediction refresh...');
  
  const staleReports = await db.query(
    `SELECT id FROM incident_reports 
     WHERE prediction_expires_at < NOW() 
     OR safety_prediction IS NULL
     LIMIT 100`
  );
  
  await Promise.all(
    staleReports.map(report => updateReportPrediction(report.id))
  );
}, 3600000);

// Start immediately
console.log('Prediction worker started');