import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs';

const menuData = JSON.parse(fs.readFileSync('./menu.json', 'utf-8'));

export const getItemsForCategory = (category) => {
    let items = [];
    if (category === 'sig') {
        items = [
            ...(menuData.menu.signature_hot_drinks || []).map(i => ({ ...i, sub: 'Hot' })), 
            ...(menuData.menu.signature_cold_drinks || []).map(i => ({ ...i, sub: 'Cold' }))
        ];
    } else if (category === 'fancy') {
        items = [
            ...(menuData.menu.fancy_hot_drinks || []).map(i => ({ ...i, sub: 'Hot' })), 
            ...(menuData.menu.fancy_cold_drinks || []).map(i => ({ ...i, sub: 'Cold' }))
        ];
    } else if (category === 'combos') {
        items = menuData.menu.member_exclusive_combos || [];
    } else {
        const data = menuData.menu[category];
        if (Array.isArray(data)) {
            items = data;
        } else if (data && typeof data === 'object') {
            // FIX: Iterate through sub-categories (like 'pastries') and tag items
            for (const [subName, subItems] of Object.entries(data)) {
                items.push(...subItems.map(item => ({ ...item, sub: subName.replace(/_/g, ' ') })));
            }
        }
    }
    return items;
};

export const createMenuEmbed = (category, page) => {
    const items = getItemsForCategory(category);
    const itemsPerPage = 5;
    const totalPages = Math.ceil(items.length / itemsPerPage) || 1;
    const start = (page - 1) * itemsPerPage;
    const pageItems = items.slice(start, start + itemsPerPage);

    // Identify the current sub-category from the first item on this page
    const currentSub = pageItems[0]?.sub ? `— ${pageItems[0].sub.toUpperCase()}` : "";

    let menuString = "";
    pageItems.forEach((item, index) => {
        let priceString = "";
        
        if (item.prices) {
            priceString = `[S: $${Number(item.prices.S).toFixed(2)} | M: $${Number(item.prices.M).toFixed(2)} | L: $${Number(item.prices.L).toFixed(2)}]`;
        } else {
            priceString = `$${Number(item.price).toFixed(2)}`;
        }

        let extraInfo = item.member ? `*${item.items}*\n_${item.desc}_` : `*${item.desc}*`;

        menuString += `\`${start + index + 1}.\` **${item.name}** — ${priceString}\n${extraInfo}\n\n`;
    });

    return new EmbedBuilder()
        .setTitle(`📖 ${category.replace(/_/g, ' ').toUpperCase()} ${currentSub}`) // Display sub-cat here
        .setDescription(menuString)
        .setFooter({ text: `Page ${page} of ${totalPages}` })
        .setColor("#5865f2");
};

export const getMenuButtons = () => {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nav_prev_menu').setLabel('<<').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('nav_prev').setLabel('<').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('menu_order_trigger').setLabel('Order Item').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('nav_next').setLabel('>').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('nav_next_menu').setLabel('>>').setStyle(ButtonStyle.Primary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('nav_back').setLabel('🔙 Back to Terminal').setStyle(ButtonStyle.Danger)
        )
    ];
};

export const MENU_ORDER = ['sig', 'fancy', 'coolers', 'shakes_and_frappes', 'snacks', 'desserts', 'combos'];