const fs = require('fs');
const data = JSON.parse(fs.readFileSync('android/bak_collection_logs.json', 'utf8'));
const clientId = "55b987e6-aa47-4c90-9e2f-7344d3f95251";
const results = data.filter(l => l.client_id === clientId);
results.forEach(l => {
    console.log(`Log ID: ${l.id} | RecordedBy: ${l.recorded_by} | Type: ${l.type}`);
});
