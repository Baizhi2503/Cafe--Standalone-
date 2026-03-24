import fs from 'fs';
const menuData = JSON.parse(fs.readFileSync('./menu.json', 'utf-8'));

export const calculatePrepTime = (orderItems) => {
    let baseTime = 0;
    orderItems.forEach(item => {
        const cat = item.category || ""; 
        if (cat.includes("signature")) baseTime += 10;
        else if (cat.includes("fancy")) baseTime += 15;
        else if (cat.includes("coolers") || cat.includes("shakes")) baseTime += 10;
        else if (cat.includes("snacks")) baseTime += 30;
        else if (cat.includes("desserts")) baseTime += 10;
        else if (cat.includes("combos")) baseTime += 45; // Updated to 45s!
        else baseTime += 15;
    });
    const minTime = Math.floor(baseTime * 0.75);
    const maxTime = Math.floor(baseTime * 1.25);
    return { minTime, maxTime };
};

export const constructMYODName = (s) => {
    let parts = [];
    if (s.temp?.label === "Cold" && s.ice?.label && s.ice.label !== "No Ice") parts.push("Iced");
    if (s.size?.label) parts.push(s.size.label);

    if (s.flavor?.label && s.flavor.label !== "None") {
        let flavorStr = s.flavor.label;
        if (s.flavor_shots?.label) {
            const pumps = s.flavor_shots.label.split(" ")[0]; 
            flavorStr = pumps + " " + flavorStr; 
        }
        parts.push(flavorStr);
    }

    if (s.isCoffee?.label === "Yes") {
        if (s.shots?.label && s.shots.label !== "None") {
            const shotStr = s.shots.label.split(" ")[0]; 
            parts.push(shotStr);
        }
        parts.push(s.type?.label ? s.type.label : "Coffee");
    } else {
        parts.push("Shake");
    }

    return parts.join(" ") || "Custom Star-Drink";
};

const DELIVERY_CHANNELS = {
    DINE_IN: process.env.DINE_IN_CHANNEL_ID,
    CAFE_LOG: process.env.CAFE_LOG_CHANNEL_ID
};

export const finalizeDelivery = async (client, customer, orderEmbed, type) => {
    const logChannel = await client.channels.fetch(DELIVERY_CHANNELS.CAFE_LOG).catch(() => null);
    if (type === 'Dine-In') {
        const channel = await client.channels.fetch(DELIVERY_CHANNELS.DINE_IN);
        if (channel) await channel.send({ content: `🔔 **Order for <@${customer.id}> is served!**`, embeds: [orderEmbed] });
    } else {
        await customer.send({ content: `📦 **Your takeaway from Akira's Lounge has arrived!**`, embeds: [orderEmbed] }).catch(() => {});
    }
    if (logChannel) await logChannel.send({ content: `✅ Order completed for **${customer.tag}** (${type})`, embeds: [orderEmbed] });
};