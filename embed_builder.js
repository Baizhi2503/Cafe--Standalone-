import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const createOrderEmbed = (customer, items = [], tip = 0) => {
    const embed = new EmbedBuilder()
        .setTitle("✨ Akira's Star-View Order Terminal")
        .setColor("#2f3136")
        .setDescription(`**Customer:** <@${customer.id}>\n\n${items.length === 0 ? "🚀 *Start ordering!!!*" : "Current selection below:"}`);

    if (items.length > 0) {
        let total = 0;
        let orderList = items.map(item => {
            total += item.price;
            return `• ${item.name} — \`$${item.price.toFixed(2)}\``;
        }).join('\n');
        
        if (tip > 0) {
            orderList += `\n• **Tip** — \`$${tip.toFixed(2)}\``;
            total += tip;
        }

        embed.addFields(
            { name: "Selected Items", value: orderList, inline: false },
            { name: "━━━━━━━━━━━━━━", value: `**Total: $${total.toFixed(2)}**`, inline: false }
        );
    }
    return embed;
};

export const getOrderButtons = () => {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('menu_sig').setLabel('Signatures').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('menu_fancy').setLabel('Fancy').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('menu_coolers').setLabel('Coolers').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('menu_shakes').setLabel('Shakes').setStyle(ButtonStyle.Primary)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('menu_snacks').setLabel('Snacks').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('menu_desserts').setLabel('Desserts').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('menu_combos').setLabel('✨ Exclusives').setStyle(ButtonStyle.Secondary),
        // UPDATED BUTTON LABEL HERE:
        new ButtonBuilder().setCustomId('myod_open').setLabel('✨ Make Your Own Drink!!!').setStyle(ButtonStyle.Secondary)
    );
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('order_cancel').setLabel('Cancel Order').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('order_reset').setLabel('Reset Order').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('order_checkout').setLabel('Confirm Order').setStyle(ButtonStyle.Success)
    );
    return [row1, row2, row3];
};

export const getYesNoButtons = (actionType) => {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`${actionType}_yes`).setLabel('Yes').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`${actionType}_no`).setLabel('No').setStyle(ButtonStyle.Danger)
    )];
};

export const getDeliveryButtons = () => {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('delivery_dinein').setLabel('🍽️ Dine-In').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('delivery_takeaway').setLabel('🥡 Takeaway').setStyle(ButtonStyle.Primary)
    )];
};

export const getTipButtons = () => {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tip_0').setLabel('No Tip').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tip_1').setLabel('$1').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tip_2').setLabel('$2').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tip_5').setLabel('$5').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tip_10').setLabel('$10').setStyle(ButtonStyle.Success)
    )];
};

export const getMYODButtons = (isLastStep) => {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('myod_prev').setLabel('Previous').setStyle(ButtonStyle.Secondary)
    );
    
    if (!isLastStep) {
        row1.addComponents(new ButtonBuilder().setCustomId('myod_choose').setLabel('Choose').setStyle(ButtonStyle.Success));
    } else {
        row1.addComponents(
            new ButtonBuilder().setCustomId('myod_reset').setLabel('Reset Order').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('myod_confirm').setLabel('Confirm Order').setStyle(ButtonStyle.Success)
        );
    }
    
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('nav_back').setLabel('🔙 Back to Terminal').setStyle(ButtonStyle.Danger)
    );

    return [row1, row2];
};

export const getCookingEmbed = (minTime, maxTime) => {
    return new EmbedBuilder()
        .setTitle("🍳 Kitchen is Busy!")
        .setColor("#e67e22")
        .setDescription(`Your order is being prepared!!\n\n**Estimated Time:** ${minTime}s - ${maxTime}s`)
        .setFooter({ text: "Quality takes time in the Star-View Lounge..." });
};