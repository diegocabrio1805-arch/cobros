const fs = require('fs');
const data = JSON.parse(fs.readFileSync('android/bak_loans.json', 'utf8'));
const clientId = "55b987e6-aa47-4c90-9e2f-7344d3f95251";
const results = data.filter(l => l.client_id === clientId);
results.forEach(l => {
    console.log(`Loan ID: ${l.id} | Collector: ${l.collector_id} | AddedBy: ${l.added_by || l.addedBy} | Status: ${l.status}`);
});
