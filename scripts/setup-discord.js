require('dotenv').config({ path: '.env.local' });
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Configuration
const TARGET_CHANNEL_NAME = 'legacy-verify'; // The channel we created
const APP_URL = process.env.NEXT_PUBLIC_TESTNET_APP;

if (!APP_URL) {
    console.error('❌ Error: NEXT_PUBLIC_TESTNET_APP is not defined. Please check your .env.local file.');
    process.exit(1);
}

const VERIFY_URL = `${APP_URL}/mission-control?trigger=discord_verify`;

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) {
        console.error('❌ DISCORD_GUILD_ID is missing in .env.local');
        process.exit(1);
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
        console.error(`❌ Bot is not in guild with ID: ${guildId}`);
        process.exit(1);
    }

    // Find the channel
    const channel = guild.channels.cache.find(c => c.name.includes(TARGET_CHANNEL_NAME));

    if (!channel) {
        console.error(`❌ Could not find channel containing name: "${TARGET_CHANNEL_NAME}"`);
        console.log('Available channels:', guild.channels.cache.map(c => c.name).join(', '));
        process.exit(1);
    }

    if (!channel.isTextBased()) {
        console.error(`❌ Channel ${channel.name} is not a text channel.`);
        process.exit(1);
    }

    console.log(`📍 Found channel: ${channel.name} (${channel.id})`);

    // Clean channel (optional - uncomment to delete previous messages)
    // const messages = await channel.messages.fetch({ limit: 10 });
    // channel.bulkDelete(messages);

    // Create Embed
    const embed = new EmbedBuilder()
        .setColor(0xE2FF3D) // Neon Yellow
        .setTitle('PROTOCOL ACCESS // VERIFICATION')
        .setDescription(
            `**Welcome to ZugChain Legacy.**\n\n` +
            `Access to this frequency is restricted to verified entities only.\n` +
            `To establish a secure uplink and claim your **Verified Human** clearance, initiate the handshake below.\n\n` +
            `_“History is written by the early believers.”_`
        )
        .setImage('https://zugchain.org/assets/discord-banner.png') // Optional: Replace with your hosted image
        .setFooter({ text: 'Secure Handshake Protocol v1.0 • ZugChain Network' });

    // Create Button
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('INITIATE UPLINK')
                .setStyle(ButtonStyle.Link)
                .setURL(VERIFY_URL)
                .setEmoji('🔗')
        );

    try {
        await channel.send({ embeds: [embed], components: [row] });
        console.log('✅ Verification message deployed successfully!');
    } catch (error) {
        console.error('❌ Failed to send message:', error);
    }

    // Done
    setTimeout(() => {
        client.destroy();
        process.exit(0);
    }, 1000);
});

client.login(process.env.DISCORD_BOT_TOKEN);
