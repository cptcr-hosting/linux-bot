import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { CommandData, SlashCommandProps, CommandOptions } from 'commandkit';
import config from "../../helpers/config";
import checkStatus from "../../helpers/checkStatus";

interface Field {
    name: string;
    value: string;
    inline: boolean;
}  

export const data = new SlashCommandBuilder()
    .setName("status")
    .setDescription("Displays the status of the infrastructure");

const emojis = {
    online: "<a:online:1339302377546584064>",
    maintenance: "<:maintenance:1339302344109854752>",
    offline: "<a:offline:1339302362761658388>"
};

const web = config.infrastructure.pages;
const nodes = config.infrastructure.nodes;

/**
 * Checks the status of each node and pushes the result into the fields array.
 */
async function checkNodeStatus(debug: boolean, fields: Field[]) {
    for (const node of nodes) {
        try {
            const response = await fetch(`${config.panel}/api/application/nodes/${node.identifier}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${config.panelAdminApiKey}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            });
            const data = await response.json();

            if (debug) {
                console.log(data);
            }

            // If maintenance_mode is enabled, mark the node as in maintenance.
            if (data.attributes && data.attributes.maintenance_mode) {
                fields.push({
                    name: node.name,
                    value: `URL: ${node.url}\nStatus: ${emojis.maintenance} Maintenance`,
                    inline: false
                });
            } else if (!response.ok) {
                fields.push({
                    name: node.name,
                    value: `URL: ${node.url}\nStatus: ${emojis.offline} Offline`,
                    inline: false
                });
            } else {
                fields.push({
                    name: node.name,
                    value: `URL: ${node.url}\nStatus: ${emojis.online} Online`,
                    inline: false
                });
            }
        } catch (error) {
            console.error(`Error checking node ${node.name}:`, error);
            fields.push({
                name: node.name,
                value: `URL: ${node.url}\nStatus: ${emojis.offline} Offline`,
                inline: false
            });
        }
    }
}

/**
 * Checks the status of each web page and pushes the result into the fields array.
 */
async function checkGeneralStatus(fields: Field[]) {
    for (const page of web) {
        try {
            const isOnline = await checkStatus(page.url, false);
            if (isOnline) {
                fields.push({
                    name: page.name,
                    value: `URL: ${page.url}\nStatus: ${emojis.online} Online`,
                    inline: false
                });
            } else {
                fields.push({
                    name: page.name,
                    value: `URL: ${page.url}\nStatus: ${emojis.offline} Offline`,
                    inline: false
                });
            }
        } catch (error) {
            console.error(`Error checking page ${page.name}:`, error);
            fields.push({
                name: page.name,
                value: `URL: ${page.url}\nStatus: ${emojis.offline} Offline`,
                inline: false
            });
        }
    }
}

/**
 * The command's run function.
 */
export async function run({ interaction, client, handler }: SlashCommandProps) {
    // Create a fresh fields array
    const fields: Field[] = [];

    // Defer the reply so we have time to check all statuses.
    await interaction.deferReply();
    await interaction.editReply({ content: "Checking infrastructure status..." });

    // Check general status and node status sequentially (you can also use Promise.all if preferred)
    await checkGeneralStatus(fields);
    await checkNodeStatus(false, fields);
    
    // Build the embed with the collected fields.
    const embed = new EmbedBuilder()
        .setTitle("Infrastructure Status")
        .setURL("https://status.cptcr.cc")
        .addFields(fields)
        .setColor("Blue")
        .setTimestamp();

    // Edit the reply with the final embed.
    await interaction.editReply({ content: "", embeds: [embed] });
}

export const options: CommandOptions = {
    devOnly: false,
    userPermissions: [],
    botPermissions: [],
    deleted: false
};
