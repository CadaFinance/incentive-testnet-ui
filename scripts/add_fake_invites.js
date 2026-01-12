
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const crypto = require('crypto');

// Load environment variables
const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
} else {
    // Fallback if running from root relative path
    const altPath = path.resolve(__dirname, '.env.local');
    if (fs.existsSync(altPath)) dotenv.config({ path: altPath });
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const TARGET_USER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'.toLowerCase();
const INVITES_TO_ADD = 1;

async function addFakeReferrals() {
    console.log(`🚀 Adding ${INVITES_TO_ADD} fake referrals for ${TARGET_USER}...`);

    try {
        // 1. Get Referral Code
        const codeRes = await pool.query('SELECT code FROM referral_codes WHERE address = $1', [TARGET_USER]);

        let referralCode;
        if (codeRes.rows.length === 0) {
            console.log('⚠️ User has no referral code. Creating one...');
            referralCode = 'ZUG-' + crypto.randomBytes(4).toString('hex').toUpperCase();
            await pool.query('INSERT INTO referral_codes (address, code) VALUES ($1, $2)', [TARGET_USER, referralCode]);
        } else {
            referralCode = codeRes.rows[0].code;
        }

        console.log(`✅ Using Referral Code: ${referralCode}`);

        // 2. Add Fake Referrals
        for (let i = 0; i < INVITES_TO_ADD; i++) {
            const fakeAddress = '0x' + crypto.randomBytes(20).toString('hex');

            await pool.query(`
                INSERT INTO referrals (referrer_address, referee_address, referral_code, registered_at, faucet_bonus_paid)
                VALUES ($1, $2, $3, NOW(), FALSE)
            `, [TARGET_USER, fakeAddress, referralCode]);

            // Optional: Also register them in users table so they look legit
            await pool.query(`
                INSERT INTO users (address, points, referred_by)
                VALUES ($1, 0, $2)
                ON CONFLICT (address) DO NOTHING
            `, [fakeAddress, TARGET_USER]);

            // Simple loading bar
            if (i % 10 === 0) process.stdout.write('.');
        }

        console.log(`\n🎉 Successfully added ${INVITES_TO_ADD} referrals!`);

        // 3. Add XP
        console.log('✨ Adding 40,000 XP...');
        await pool.query('UPDATE users SET points = points + 4000 WHERE address = $1', [TARGET_USER]);

        // 4. Verify New Count
        const countRes = await pool.query('SELECT COUNT(*) FROM referrals WHERE referrer_address = $1', [TARGET_USER]);
        console.log(`📊 New Total Invite Count: ${countRes.rows[0].count}`);

        // 5. Clear Redis Cache (to update UI immediately)
        console.log('🔄 Clearing Redis Cache...');
        const Redis = require('ioredis');
        const redis = new Redis(process.env.REDIS_URL);
        const key = `user:stats:${TARGET_USER}`;
        try {
            await redis.del(key);
            console.log(`✅ Cache cleared for ${key}`);
        } catch (rErr) {
            console.error('⚠️ Failed to clear cache:', rErr.message);
        } finally {
            redis.disconnect();
        }

    } catch (e) {
        console.error('❌ Error adding referrals:', e);
    } finally {
        await pool.end();
    }
}

addFakeReferrals();
