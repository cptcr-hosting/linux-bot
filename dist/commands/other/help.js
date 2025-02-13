"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.options = exports.data = void 0;
exports.run = run;
const discord_js_1 = require("discord.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * A helper to recursively load commands from the ../commands folder,
 * skipping the help command itself.
 *
 * @returns An array of objects { name: string, description: string, fullBuilder: SlashCommandBuilder }
 */
function loadAllCommands() {
    const commandsDir = path_1.default.join(__dirname, "..");
    const loaded = [];
    function readFolder(folderPath) {
        const files = fs_1.default.readdirSync(folderPath, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path_1.default.join(folderPath, file.name);
            if (file.isDirectory()) {
                readFolder(fullPath);
            }
            else {
                if (file.name.endsWith(".ts") || file.name.endsWith(".js")) {
                    if (file.name.toLowerCase().includes("help")) {
                        continue;
                    }
                    try {
                        const cmdModule = require(fullPath);
                        if (cmdModule?.data) {
                            const builder = cmdModule.data;
                            loaded.push({
                                name: builder.name,
                                description: builder.description,
                                fullBuilder: builder,
                            });
                        }
                    }
                    catch {
                    }
                }
            }
        }
    }
    readFolder(commandsDir);
    return loaded;
}
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("help")
    .setDescription("Displays all commands in this bot.");
async function run({ interaction }) {
    // 1) Load all commands from ../commands
    const commands = loadAllCommands(); // each has name, description, fullBuilder
    // If no commands found, respond with an error
    if (!commands.length) {
        return interaction.reply({
            content: "No commands found in the ../commands folder.",
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
    // 2) Build the base embed
    const baseEmbed = new discord_js_1.EmbedBuilder()
        .setTitle("Help Menu")
        .setDescription("Click a button below to see details about a specific command.")
        .setFooter({ text: "Buttons remain active for 2 minutes." });
    // 3) Create one button per command, up to 5 in a row
    const rows = [];
    let currentRow = new discord_js_1.ActionRowBuilder();
    commands.forEach((cmd, index) => {
        const button = new discord_js_1.ButtonBuilder()
            .setCustomId(`help_${cmd.name}`)
            .setLabel(`/${cmd.name}`)
            .setStyle(discord_js_1.ButtonStyle.Primary);
        currentRow.addComponents(button);
        if ((index + 1) % 5 === 0) {
            rows.push(currentRow);
            currentRow = new discord_js_1.ActionRowBuilder();
        }
    });
    if (currentRow.components.length > 0) {
        rows.push(currentRow);
    }
    const msg = await interaction.reply({
        embeds: [baseEmbed],
        components: rows,
        flags: discord_js_1.MessageFlags.Ephemeral,
    });
    const collector = msg.createMessageComponentCollector({
        componentType: discord_js_1.ComponentType.Button,
        time: 2 * 60000,
        filter: (i) => i.user.id === interaction.user.id,
    });
    collector.on("collect", async (btnInt) => {
        const customId = btnInt.customId;
        if (!customId.startsWith("help_"))
            return;
        const cmdName = customId.slice("help_".length);
        const cmdFound = commands.find((c) => c.name === cmdName);
        if (!cmdFound) {
            return btnInt.reply({
                content: `Command "/${cmdName}" not found.`,
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
        }
        const detailEmbed = buildCommandDetailEmbed(cmdFound.fullBuilder);
        await btnInt.update({
            embeds: [detailEmbed],
            components: rows,
        });
    });
    collector.on("end", () => {
    });
}
exports.options = {
    devOnly: false,
    userPermissions: [],
    botPermissions: [],
    deleted: false,
};
/**
 * Builds a detail embed for the given SlashCommandBuilder
 * listing subcommand groups, subcommands, and any normal options.
 */
function buildCommandDetailEmbed(builder) {
    const cmdJSON = builder.toJSON();
    const name = cmdJSON.name;
    const description = cmdJSON.description;
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`/${name}`)
        .setDescription(description || "No description.")
        .setColor("Blue");
    if (Array.isArray(cmdJSON.options)) {
        const subGroups = cmdJSON.options.filter((o) => o.type === 2);
        const subCommands = cmdJSON.options.filter((o) => o.type === 1);
        const normalOpts = cmdJSON.options.filter((o) => ![1, 2].includes(o.type));
        if (subGroups.length) {
            const lines = subGroups.map((g) => {
                const subLines = (g.options || [])
                    .map((sc) => `   • **/${name} ${g.name} ${sc.name}** – ${sc.description}`)
                    .join("\n");
                return `**Group** \`${g.name}\`:\n${subLines}`;
            });
            embed.addFields({
                name: "Subcommand Groups",
                value: lines.join("\n\n"),
            });
        }
        // Subcommands
        if (subCommands.length) {
            const lines = subCommands.map((sc) => `• **/${name} ${sc.name}** – ${sc.description}`);
            embed.addFields({
                name: "Subcommands",
                value: lines.join("\n"),
            });
        }
        // Normal Options
        if (normalOpts.length) {
            const lines = normalOpts.map((opt) => {
                return `• \`${opt.name}\` (${opt.type}) - ${opt.description}`;
            });
            embed.addFields({
                name: "Options",
                value: lines.join("\n"),
            });
        }
    }
    return embed;
}
