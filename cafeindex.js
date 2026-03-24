import 'dotenv/config';
import { 
    Client, 
    GatewayIntentBits, 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    REST, 
    Routes, 
    ActivityPlatform,
    ActivityType
} from 'discord.js';
import { createOrderEmbed, getOrderButtons } from './embed_builder.js';
import { handleCafeButtons, handleCafeModals } from './interaction_handler.js';

// --- Configuration & Client Setup ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages
    ]
});

export const activeOrders = new Map();

// --- Command Definition ---
export const cafeCommand = {
    data: new SlashCommandBuilder()
        .setName('cafe')
        .setDescription("Open Akira's Star-View terminal.")
        .addUserOption(opt => opt.setName('customer').setDescription('Member ordering').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const customer = interaction.options.getUser('customer');
        
        activeOrders.set(customer.id, { 
            customer, 
            items: [], 
            currentMenu: 'sig', 
            currentPage: 1,
            status: 'ordering', 
            myodData: {}, 
            myodStep: 0, 
            tip: 0,
            deliveryType: null
        });

        await interaction.reply({ 
            content: `☕ **Welcome to the Lounge, ${customer}!**`, 
            embeds: [createOrderEmbed(customer, [])], 
            components: getOrderButtons() 
        });
    }
};

// --- Command Registration (Self-Executing) ---
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('✨ Registering Cafe Slash Commands...');
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: [cafeCommand.data.toJSON()] },
        );
        console.log('✅ Commands Registered.');
    } catch (error) {
        console.error('❌ Failed to register commands:', error);
    }
})();

// --- Interaction Listener ---
client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand() && i.commandName === 'cafe') {
        return cafeCommand.execute(i);
    }
    
    if (i.isButton()) {
        const cafePrefixes = ['menu_', 'nav_', 'order_', 'cancel_', 'reset_', 'receipt_', 'delivery_', 'tip_', 'myod_'];
        if (cafePrefixes.some(prefix => i.customId.startsWith(prefix))) {
            return handleCafeButtons(i);
        }
    }

    if (i.isModalSubmit()) {
        if (i.customId.startsWith('myod_') || i.customId === 'cafe_order_modal') {
            return handleCafeModals(i);
        }
    }
});

client.once('ready', () => {
    client.user.setPresence("Akira's Star-View Lounge", { type: ActivityType.Watching });
    console.log(`🚀 Akira's Cafe Bot is online as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);