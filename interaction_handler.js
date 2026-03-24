import { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { activeOrders } from './cafeindex.js';
import { 
    createOrderEmbed, 
    getOrderButtons, 
    getYesNoButtons, 
    getDeliveryButtons, 
    getTipButtons, 
    getMYODButtons, 
    getCookingEmbed 
} from './embed_builder.js';
import * as menuLogic from './menu_logic.js';
import { calculatePrepTime, finalizeDelivery, constructMYODName } from './cafe_utils.js';
import fs from 'fs';

const myodData = JSON.parse(fs.readFileSync('./myod_data.json', 'utf-8'));

const renderMYODStep = (session) => {
    if (session.myodStep < 0) session.myodStep = 0;

    if (session.myodStep < myodData.steps.length) {
        const step = myodData.steps[session.myodStep];
        let skip = false;

        if ((step.id === 'type' || step.id === 'shots') && session.myodData.isCoffee?.label === 'No') skip = true;
        if (step.id === 'flavor_shots' && (!session.myodData.flavor || session.myodData.flavor.label === 'None')) skip = true;
        if (step.id === 'ice' && session.myodData.temp?.label === 'Hot') skip = true;

        if (skip) {
            session.myodStep += session.myodDirection || 1;
            return renderMYODStep(session); 
        }
    }

    if (session.myodStep >= myodData.steps.length) {
        const customName = constructMYODName(session.myodData);
        const embed = new EmbedBuilder()
            .setTitle("✨ Review Your Custom Drink")
            .setColor("#5865f2")
            .setDescription(`**Recipe:**\n` + 
                Object.keys(session.myodData).map(k => {
                    const label = session.myodData[k].label;
                    const prettyKey = k.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                    return `• **${prettyKey}:** ${label}`;
                }).join('\n') +
                `\n\n**Final Name:** ${customName}`
            );
        return { embeds: [embed], components: getMYODButtons(true) };
    } else {
        const step = myodData.steps[session.myodStep];
        const optionsText = step.options.map((opt, i) => `\`${i + 1}.\` ${opt.label}`).join('\n');
        const currentChoice = session.myodData[step.id] ? `\n\n*Current Selection: ${session.myodData[step.id].label}*` : '';
        const embed = new EmbedBuilder()
            .setTitle(`✨ MYOD: Step ${session.myodStep + 1}/${myodData.steps.length}`)
            .setDescription(`**${step.prompt}**\n\n${optionsText}${currentChoice}`)
            .setColor("#5865f2");
        return { embeds: [embed], components: getMYODButtons(false) };
    }
};

export async function handleCafeButtons(interaction) {
    const session = Array.from(activeOrders.values()).find(s => s.customer.id === interaction.user.id);
    if (!session) return interaction.reply({ content: "❌ Not your order tray!", ephemeral: true });

    const id = interaction.customId;

    if (id.startsWith('menu_') && id !== 'menu_order_trigger') {
        const categoryMap = { 'sig': 'sig', 'fancy': 'fancy', 'coolers': 'coolers', 'shakes': 'shakes_and_frappes', 'snacks': 'snacks', 'desserts': 'desserts', 'combos': 'combos' };
        session.currentMenu = categoryMap[id.replace('menu_', '')] || 'sig';
        session.currentPage = 1;
        return interaction.update({ embeds: [menuLogic.createMenuEmbed(session.currentMenu, session.currentPage)], components: menuLogic.getMenuButtons() });
    }

    if (id === 'nav_next') {
        const totalPages = Math.ceil(menuLogic.getItemsForCategory(session.currentMenu).length / 5) || 1;
        if (session.currentPage < totalPages) session.currentPage++;
        return interaction.update({ embeds: [menuLogic.createMenuEmbed(session.currentMenu, session.currentPage)], components: menuLogic.getMenuButtons() });
    }
    
    if (id === 'nav_prev') {
        if (session.currentPage > 1) session.currentPage--;
        return interaction.update({ embeds: [menuLogic.createMenuEmbed(session.currentMenu, session.currentPage)], components: menuLogic.getMenuButtons() });
    }

    if (id === 'nav_next_menu' || id === 'nav_prev_menu') {
        const currentIndex = menuLogic.MENU_ORDER.indexOf(session.currentMenu);
        let nextIndex = id === 'nav_next_menu' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= menuLogic.MENU_ORDER.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = menuLogic.MENU_ORDER.length - 1;
        
        session.currentMenu = menuLogic.MENU_ORDER[nextIndex];
        session.currentPage = 1;
        return interaction.update({ embeds: [menuLogic.createMenuEmbed(session.currentMenu, session.currentPage)], components: menuLogic.getMenuButtons() });
    }

    if (id === 'nav_back') {
        session.myodData = {};
        session.myodStep = 0;
        return interaction.update({ embeds: [createOrderEmbed(session.customer, session.items)], components: getOrderButtons() });
    }

    if (id === 'menu_order_trigger') {
        const modal = new ModalBuilder().setCustomId('cafe_order_modal').setTitle('Add to Tray');
        const numInput = new TextInputBuilder().setCustomId('item_number').setLabel('Enter Item Number').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(numInput));

        const items = menuLogic.getItemsForCategory(session.currentMenu);
        const hasSizes = items.some(item => item.prices);

        if (hasSizes) {
            const sizeInput = new TextInputBuilder().setCustomId('item_size').setLabel('Size (S, M, L) - Leave blank if N/A').setStyle(TextInputStyle.Short).setRequired(false);
            modal.addComponents(new ActionRowBuilder().addComponents(sizeInput));
        }

        return interaction.showModal(modal);
    }

    if (id === 'order_cancel' || id === 'order_reset') {
        const action = id.split('_')[1]; 
        const embed = new EmbedBuilder().setTitle(`${action.charAt(0).toUpperCase() + action.slice(1)} Order?`).setDescription(`Are you sure you want to ${action} your order?`).setColor("#e74c3c");
        return interaction.update({ embeds: [embed], components: getYesNoButtons(action) }); 
    }

    if (id === 'order_checkout') {
        if (session.items.length === 0) return interaction.reply({ content: "Your tray is empty!", ephemeral: true });
        session.status = 'receipt';
        const embed = createOrderEmbed(session.customer, session.items).setDescription(`**Are you ready to confirm this order receipt?**`);
        return interaction.update({ embeds: [embed], components: getYesNoButtons('receipt') });
    }

    if (id.startsWith('cancel_') || id.startsWith('reset_') || id.startsWith('receipt_')) {
        const [action, choice] = id.split('_');
        
        if (action === 'receipt') {
            if (choice === 'yes') {
                session.status = 'delivery';
                const embed = new EmbedBuilder().setTitle("Delivery Type").setDescription("Will this be Dine-In or Takeaway?").setColor("#5865f2");
                return interaction.update({ embeds: [embed], components: getDeliveryButtons() });
            } else {
                session.status = 'ordering';
                return interaction.update({ embeds: [createOrderEmbed(session.customer, session.items)], components: getOrderButtons() });
            }
        }
        
        if (action === 'cancel') {
            if (choice === 'yes') {
                activeOrders.delete(session.customer.id);
                return interaction.update({ content: "Order cancelled.", embeds: [], components: [] });
            } else {
                return interaction.update({ embeds: [createOrderEmbed(session.customer, session.items)], components: getOrderButtons() });
            }
        }
        
        if (action === 'reset') {
            if (choice === 'yes') session.items = [];
            return interaction.update({ embeds: [createOrderEmbed(session.customer, session.items)], components: getOrderButtons() });
        }
    }

    if (id.startsWith('delivery_')) {
        session.deliveryType = id === 'delivery_dinein' ? 'Dine-In' : 'Takeaway';
        session.status = 'tip';
        const embed = new EmbedBuilder().setTitle("Tip").setDescription("Would you like to leave a tip for Akira?").setColor("#5865f2");
        return interaction.update({ embeds: [embed], components: getTipButtons() });
    }

    if (id.startsWith('tip_')) {
        session.tip = parseInt(id.split('_')[1], 10);
        session.status = 'cooking';
        
        const { minTime, maxTime } = calculatePrepTime(session.items);
        await interaction.update({ embeds: [getCookingEmbed(minTime, maxTime)], components: [] });
        
        const actualWaitMs = Math.floor(Math.random() * (maxTime - minTime + 1) + minTime) * 1000;
        
        setTimeout(async () => {
            let total = session.items.reduce((sum, item) => sum + item.price, 0) + session.tip;
            const finalEmbed = createOrderEmbed(session.customer, session.items, session.tip)
                .addFields({ name: "Receipt Information", value: `- Ordered by <@${session.customer.id}>\n- Paid **$${total.toFixed(2)}**\n\n*Thank you for ordering!!! Have a nice day ^^*` });
                
            await finalizeDelivery(interaction.client, session.customer, finalEmbed, session.deliveryType);
            
            await interaction.editReply({ 
                content: `✅ **<@${session.customer.id}>, your order is ready and has been served!**`, 
                embeds: [finalEmbed] 
            }).catch(()=>{});

            activeOrders.delete(session.customer.id);
        }, actualWaitMs);
    }

    if (id === 'myod_open') {
        session.myodData = {};
        session.myodStep = 0;
        session.myodDirection = 1;
        return interaction.update(renderMYODStep(session));
    }
    
    if (id === 'myod_prev') {
        session.myodDirection = -1;
        session.myodStep--;
        return interaction.update(renderMYODStep(session));
    }
    
    if (id === 'myod_choose') {
        const modal = new ModalBuilder().setCustomId('myod_choice_modal').setTitle('Make Your Choice');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('myod_option_index').setLabel('Enter Option Number').setStyle(TextInputStyle.Short).setRequired(true)));
        return interaction.showModal(modal);
    }
    
    if (id === 'myod_confirm') {
        const customName = constructMYODName(session.myodData);
        let price = myodData.base_price || 5.00;
        Object.values(session.myodData).forEach(opt => {
            if (opt && opt.price) price += opt.price;
        });
        
        session.items.push({ name: `✨ ${customName}`, price: price, category: 'fancy' });
        session.myodData = {};
        session.myodStep = 0;
        return interaction.update({ embeds: [createOrderEmbed(session.customer, session.items)], components: getOrderButtons() });
    }
    
    if (id === 'myod_reset') {
        session.myodData = {};
        session.myodStep = 0;
        return interaction.update({ embeds: [createOrderEmbed(session.customer, session.items)], components: getOrderButtons() });
    }
}

export async function handleCafeModals(interaction) {
    const session = Array.from(activeOrders.values()).find(s => s.customer.id === interaction.user.id);
    if (!session) return interaction.reply({ content: "Expired.", ephemeral: true });

    if (interaction.customId === 'cafe_order_modal') {
        const itemNum = parseInt(interaction.fields.getTextInputValue('item_number'), 10);
        
        let sizeInput = 'M';
        try {
            sizeInput = interaction.fields.getTextInputValue('item_size')?.trim().toUpperCase() || 'M';
        } catch(e) {}
        
        const allItems = menuLogic.getItemsForCategory(session.currentMenu);
        const selectedItem = allItems[itemNum - 1]; // Use index directly based on the full category array

        if (selectedItem) {
            let price;
            let finalName = selectedItem.name;
            
            // FIX: Ensure the extracted price is always treated as a Number
            if (selectedItem.prices) {
                const sizeMap = { 'S': 'S', 'M': 'M', 'L': 'L', 'SMALL': 'S', 'MEDIUM': 'M', 'LARGE': 'L' };
                const parsedSize = sizeMap[sizeInput] || 'M';
                price = Number(selectedItem.prices[parsedSize]) || 0;
                finalName = `[${parsedSize}] ${selectedItem.name}`;
            } else {
                price = Number(selectedItem.price) || 0;
            }
            
            session.items.push({ name: finalName, price: price, category: session.currentMenu });
            return interaction.update({ embeds: [createOrderEmbed(session.customer, session.items)], components: getOrderButtons() });
        } else {
            return interaction.reply({ content: "❌ Invalid item number!", ephemeral: true });
        }
    }

    if (interaction.customId === 'myod_choice_modal') {
        const step = myodData.steps[session.myodStep];
        const index = parseInt(interaction.fields.getTextInputValue('myod_option_index'), 10) - 1;
        
        if (step.options[index]) {
            session.myodData[step.id] = step.options[index];
            session.myodDirection = 1;
            session.myodStep++;
            return interaction.update(renderMYODStep(session));
        } else {
            return interaction.reply({ content: '❌ Invalid option number!', ephemeral: true });
        }
    }
}