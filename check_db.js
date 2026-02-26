const https = require('https');

const url = "https://lvhdyvlqaqzdbixnwixq.supabase.co/rest/v1/";
const key = process.env.SUPABASE_ANON_KEY || "YOUR_SUPABASE_SERVICE_ROLE_KEY";

const options = {
    headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
    }
};

https.get(url, options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        if (res.statusCode === 200) {
            try {
                const spec = JSON.parse(data);
                const definitions = spec.definitions || {};
                console.log("AVAILABLE TABLES:", Object.keys(definitions));
                for (const [table, def] of Object.entries(definitions)) {
                    console.log(`\nTABLE: ${table}`);
                    console.log("COLUMNS:", Object.keys(def.properties || {}));
                }
            } catch (e) {
                console.error("Error parsing JSON:", e.message);
            }
        } else {
            console.error(`Status Code: ${res.statusCode}`);
            console.error("Body:", data);
        }
    });
}).on('error', (e) => {
    console.error("Error:", e.message);
});
