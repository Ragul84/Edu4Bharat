require('dotenv').config();

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function checkStructure() {
    const url = `${UPSTASH_URL}/SRANDMEMBER/quizzes:history`;
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const result = await response.json();
    console.log("🔍 CURRENT STRUCTURE:", result.result);
}

checkStructure();
