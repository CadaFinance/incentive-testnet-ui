
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const address = process.argv[2] || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

async function main() {
    console.log(`🚀 Setting up "Entry on Day 7" Scenario for: ${address}`);
    const client = await pool.connect();

    try {
        const normalizedAddress = address.toLowerCase();

        // 1. Reset Faucet Streak to 6, Last Action = Yesterday (So today becomes Day 7)
        console.log('1️⃣  Setting FAUCET Streak to 6, Last Action: Yesterday...');
        await client.query(`
            INSERT INTO daily_streaks (address, streak_type, current_streak, last_action_date, updated_at, cooldown_start_at) 
            VALUES ($1, 'FAUCET', 6, (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '1 day', NOW() AT TIME ZONE 'UTC', NOW() AT TIME ZONE 'UTC') 
            ON CONFLICT (address, streak_type) DO UPDATE SET 
                current_streak = 6,
                last_action_date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '1 day',
                updated_at = NOW() AT TIME ZONE 'UTC',
                cooldown_start_at = NOW() AT TIME ZONE 'UTC'
        `, [normalizedAddress]);

        // 2. Ensure NO Faucet Claim happened TODAY
        console.log('2️⃣  Clearing any Faucet History for TODAY...');
        await client.query(`
            DELETE FROM faucet_history 
            WHERE address = $1 
            AND (claimed_at AT TIME ZONE 'UTC')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date
        `, [normalizedAddress]);

        // 3. Reset STAKE Streak to 6, Last Action = Yesterday
        console.log('3️⃣  Setting STAKE Streak to 6, Last Action: Yesterday...');
        await client.query(`
            INSERT INTO daily_streaks (address, streak_type, current_streak, last_action_date, updated_at, cooldown_start_at) 
            VALUES ($1, 'STAKE', 6, (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '1 day', NOW() AT TIME ZONE 'UTC', NOW() AT TIME ZONE 'UTC') 
            ON CONFLICT (address, streak_type) DO UPDATE SET 
                current_streak = 6,
                last_action_date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date - INTERVAL '1 day',
                updated_at = NOW() AT TIME ZONE 'UTC',
                cooldown_start_at = NOW() AT TIME ZONE 'UTC'
        `, [normalizedAddress]);

        // 4. Ensure NO Staking happened TODAY
        console.log('4️⃣  Clearing any Staking History for TODAY...');
        await client.query(`
            DELETE FROM staking_history 
            WHERE address = $1 
            AND (created_at AT TIME ZONE 'UTC')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date
        `, [normalizedAddress]);

        // 5. Reset Modal Flag
        console.log('5️⃣  Ensuring Streak Modal is reset...');
        await client.query(`
             UPDATE users SET has_pending_streak_modal = FALSE WHERE address = $1
         `, [normalizedAddress]);


        console.log('\n✅ State Prepared: "Day 7 Morning"');
        console.log('   - Streak: 6 (Yesterday)');
        console.log('   - Last Active: Yesterday');
        console.log('   - Today Claimed: NO');
        console.log('👉 Now, when you perform a FAUCET/STAKE claim, the system should detect "Consecutive" -> And Increment Streak to 7.');

    } catch (e) {
        console.error("❌ Error setting up scenario:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
