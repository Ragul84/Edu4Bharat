const fetch = require('node-fetch');
require('dotenv').config();

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function wipeDummies() {
    const subjects = ["history", "polity", "geography", "science", "english", "economics"];
    const url = `${UPSTASH_URL}/pipeline`;
    const commands = [];

    for (const subject of subjects) {
        // Keep only the first 200 (the original high-quality ones)
        commands.push(["LTRIM", `quiz:subject:${subject}`, 0, 199]);
        // We'll reset the ID sets later to match the 200
        commands.push(["DEL", `quiz:ids:${subject}`]);
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        body: JSON.stringify(commands)
    });
    console.log("🧹 DATABASE CLEANED: Dummy questions removed. Back to stable 200 per subject.");
}

wipeDummies();
