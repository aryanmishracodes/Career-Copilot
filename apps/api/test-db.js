const { getDb, users } = require('@career-copilot/db');
const { eq } = require('drizzle-orm');

async function test() {
  try {
    const db = getDb('postgres://postgres:password@localhost:5432/career_copilot');
    const existingUser = await db.select().from(users).limit(1);
    console.log("Success:", existingUser);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit();
}

test();
