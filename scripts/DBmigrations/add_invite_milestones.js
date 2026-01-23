const { Client } = require('pg');

const DATABASE_URL = 'postgres://blockscout:Oh16ogZtxZtVgLx6yMpptvTYY8rhY6w11UlDwZQfjzGdxPcycO@20.160.155.158:7433/zug_incentive';

async function addInviteMilestones() {
    console.log('🔌 Connecting to database...');
    const client = new Client({ connectionString: DATABASE_URL });

    try {
        await client.connect();
        console.log('✅ Connected successfully\n');

        await client.query('BEGIN');

        // ===================================
        // 1. CREATE invite_milestone_tasks TABLE
        // ===================================
        console.log('📊 Creating invite_milestone_tasks table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS invite_milestone_tasks (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                required_verified_invites INTEGER NOT NULL,
                reward_points INTEGER NOT NULL,
                icon VARCHAR(10) DEFAULT '🎯',
                tier_order INTEGER NOT NULL UNIQUE,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ Table invite_milestone_tasks created');

        // ===================================
        // 2. CREATE user_invite_completions TABLE
        // ===================================
        console.log('📊 Creating user_invite_completions table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_invite_completions (
                id SERIAL PRIMARY KEY,
                user_address VARCHAR NOT NULL,
                milestone_id INTEGER NOT NULL REFERENCES invite_milestone_tasks(id) ON DELETE CASCADE,
                claimed_at TIMESTAMPTZ DEFAULT NOW(),
                points_awarded INTEGER NOT NULL,
                UNIQUE(user_address, milestone_id)
            );
        `);
        console.log('✅ Table user_invite_completions created');

        // ===================================
        // 3. CREATE INDEXES
        // ===================================
        console.log('🔍 Creating indexes...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_invite_milestones_active 
            ON invite_milestone_tasks(is_active, tier_order);
            
            CREATE INDEX IF NOT EXISTS idx_user_invite_completions_address 
            ON user_invite_completions(user_address);
            
            CREATE INDEX IF NOT EXISTS idx_user_invite_completions_milestone 
            ON user_invite_completions(milestone_id);
        `);
        console.log('✅ Indexes created');

        // ===================================
        // 4. INSERT INITIAL MILESTONES
        // ===================================
        console.log('🌱 Seeding initial milestone data...');

        // Check if data already exists
        const existing = await client.query('SELECT COUNT(*) FROM invite_milestone_tasks');
        if (parseInt(existing.rows[0].count) > 0) {
            console.log('⚠️  Milestones already exist, skipping seed...');
        } else {
            await client.query(`
                INSERT INTO invite_milestone_tasks 
                (name, description, required_verified_invites, reward_points, icon, tier_order) 
                VALUES
                ('INVITE 1', 'Successfully verify 1 network recruit', 1, 500, 'Shield', 1),
                ('INVITE 5', 'Successfully verify 5 network recruits', 5, 2500, 'Swords', 2),
                ('INVITE 10', 'Successfully verify 10 network recruits', 10, 5000, 'Award', 3),
                ('INVITE 25', 'Successfully verify 25 network recruits', 25, 15000, 'Crown', 4),
                ('INVITE 50', 'Successfully verify 50 network recruits', 50, 25000, 'Zap', 5),
                ('INVITE 100', 'Successfully verify 100 network recruits', 100, 50000, 'Sparkles', 6);
            `);
            console.log('✅ Initial milestones seeded (6 tiers)');
        }

        await client.query('COMMIT');
        console.log('\n🎉 Migration completed successfully!\n');

        // Display summary
        const milestones = await client.query('SELECT * FROM invite_milestone_tasks ORDER BY tier_order');
        console.log('📋 Current Milestones:');
        console.log('┌────┬─────────────────────┬──────────────┬────────────┐');
        console.log('│ ID │ Name                │ Req. Invites │ Reward XP  │');
        console.log('├────┼─────────────────────┼──────────────┼────────────┤');
        milestones.rows.forEach(m => {
            console.log(`│ ${String(m.id).padEnd(2)} │ ${m.name.padEnd(19)} │ ${String(m.required_verified_invites).padStart(12)} │ ${String(m.reward_points).padStart(10)} │`);
        });
        console.log('└────┴─────────────────────┴──────────────┴────────────┘\n');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n❌ Migration failed:', err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Connection closed');
    }
}

// Run if executed directly
if (require.main === module) {
    addInviteMilestones();
}

module.exports = { addInviteMilestones };
