"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.options = exports.data = void 0;
exports.run = run;
// @ts-ignore: 2835
const discord_js_1 = require("discord.js");
// @ts-ignore: 2835
const apiKey_1 = __importDefault(require("../../models/apiKey"));
// @ts-ignore: 2835
const config_1 = __importDefault(require("../../helpers/config"));
const SERVER_AREA_URL = config_1.default.panel;
const SHOP_AREA_URL = config_1.default.billing;
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("api")
    .setDescription("API Key control")
    // === MISC SUBCOMMAND GROUP ===
    .addSubcommandGroup((group) => group
    .setName("misc")
    .setDescription("Misc commands")
    .addSubcommand((sub) => sub
    .setName("view-keys")
    .setDescription("View your stored ApiKeys"))
    .addSubcommand((sub) => sub.setName("view").setDescription("View your stored api keys")))
    // === SERVER-AREA SUBCOMMAND GROUP ===
    .addSubcommandGroup((group) => group
    .setName("server-area")
    .setDescription("Key manager for the server area")
    .addSubcommand((sub) => sub
    .setName("add")
    .setDescription("Add the api key for the server area.")
    .addStringOption((o) => o
    .setName("key")
    .setDescription(`Your key from ${SERVER_AREA_URL}.`)
    .setRequired(true)))
    .addSubcommand((sub) => sub
    .setName("update")
    .setDescription("Update your api key.")
    .addStringOption((o) => o
    .setName("key")
    .setDescription(`Your key from ${SERVER_AREA_URL}.`)
    .setRequired(true)))
    .addSubcommand((sub) => sub
    .setName("delete")
    .setDescription("Removes your API Key from the bot's database.")))
    // === BILLING-AREA SUBCOMMAND GROUP ===
    .addSubcommandGroup((group) => group
    .setName("billing-area")
    .setDescription("Key manager for the shop area")
    .addSubcommand((sub) => sub
    .setName("add")
    .setDescription("Add the api key for the shop area.")
    .addStringOption((o) => o
    .setName("key")
    .setDescription(`Your key from ${SHOP_AREA_URL}.`)
    .setRequired(true)))
    .addSubcommand((sub) => sub
    .setName("update")
    .setDescription("Update your api key.")
    .addStringOption((o) => o
    .setName("key")
    .setDescription(`Your key from ${SHOP_AREA_URL}.`)
    .setRequired(true)))
    .addSubcommand((sub) => sub
    .setName("delete")
    .setDescription("Removes your API Key from the bot's database.")));
async function run({ interaction, client }) {
    // Identify which group/subcommand the user chose
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand(false);
    // Fetch user data from your database
    const data = await apiKey_1.default.findOne({ userId: interaction.user.id });
    switch (group) {
        // ========================== MISC ==========================
        case "misc": {
            switch (sub) {
                case "view-keys":
                case "view": {
                    // Both "view-keys" and "view" do the same thing here
                    const embed = new discord_js_1.EmbedBuilder()
                        .setTitle("Your Stored API Keys")
                        .setColor("Blue")
                        .addFields({
                        name: "Server Area API Key:",
                        value: data?.pterodactyl
                            ? `||${data.pterodactyl}||`
                            : "❌ Not Found",
                        inline: false,
                    }, {
                        name: "Billing Area API Key:",
                        value: data?.paymenter
                            ? `||${data.paymenter}||`
                            : "❌ Not Found",
                        inline: false,
                    })
                        .setFooter({
                        text: "Use /api server-area or /api billing-area to manage your keys.",
                    });
                    return interaction.reply({ embeds: [embed], flags: discord_js_1.MessageFlags.Ephemeral });
                }
                default:
                    return interaction.reply({
                        content: "Unknown 'misc' subcommand.",
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    });
            }
        }
        // ====================== SERVER AREA =======================
        case "server-area": {
            switch (sub) {
                case "add": {
                    if (data?.pterodactyl) {
                        return interaction.reply({
                            content: "You already added an API key. Use `/api server-area update` to change it or `/api server-area delete` to remove it.",
                            flags: discord_js_1.MessageFlags.Ephemeral,
                        });
                    }
                    await apiKey_1.default.updateOne({ userId: interaction.user.id }, { pterodactyl: interaction.options.getString("key") }, { upsert: true });
                    return interaction.reply({
                        content: "Your API key has been added successfully.", flags: discord_js_1.MessageFlags.Ephemeral
                    });
                }
                case "update": {
                    if (!data?.pterodactyl) {
                        return interaction.reply({
                            content: "No server-area API key found in my database for you.",
                            flags: discord_js_1.MessageFlags.Ephemeral
                        });
                    }
                    await apiKey_1.default.updateOne({ userId: interaction.user.id }, { pterodactyl: interaction.options.getString("key") });
                    return interaction.reply({
                        content: "Your API key has been updated successfully.",
                        flags: discord_js_1.MessageFlags.Ephemeral
                    });
                }
                case "delete": {
                    if (!data?.pterodactyl) {
                        return interaction.reply({
                            content: "No server-area API key found in my database for you.",
                            flags: discord_js_1.MessageFlags.Ephemeral
                        });
                    }
                    await apiKey_1.default.updateOne({ userId: interaction.user.id }, { $unset: { pterodactyl: 1 } });
                    return interaction.reply({
                        content: "Your API key has been deleted successfully.",
                        flags: discord_js_1.MessageFlags.Ephemeral
                    });
                }
                default:
                    return interaction.reply({
                        content: "Invalid subcommand in server-area.",
                        flags: discord_js_1.MessageFlags.Ephemeral
                    });
            }
        }
        // ====================== BILLING AREA ======================
        case "billing-area": {
            switch (sub) {
                case "add": {
                    if (data?.paymenter) {
                        return interaction.reply({
                            content: "You already added a billing-area API key. Use `/api billing-area update` or `/api billing-area delete`.",
                            flags: discord_js_1.MessageFlags.Ephemeral
                        });
                    }
                    await apiKey_1.default.updateOne({ userId: interaction.user.id }, { paymenter: interaction.options.getString("key") }, { upsert: true });
                    return interaction.reply({
                        content: "Your API key has been added successfully.",
                        flags: discord_js_1.MessageFlags.Ephemeral
                    });
                }
                case "update": {
                    if (!data?.paymenter) {
                        return interaction.reply({
                            content: "No billing-area API key found in my database for you.",
                            flags: discord_js_1.MessageFlags.Ephemeral
                        });
                    }
                    await apiKey_1.default.updateOne({ userId: interaction.user.id }, { paymenter: interaction.options.getString("key") });
                    return interaction.reply({
                        content: "Your API key has been updated successfully.",
                        flags: discord_js_1.MessageFlags.Ephemeral
                    });
                }
                case "delete": {
                    if (!data?.paymenter) {
                        return interaction.reply({
                            content: "No billing-area API key found in my database for you.",
                            flags: discord_js_1.MessageFlags.Ephemeral
                        });
                    }
                    await apiKey_1.default.updateOne({ userId: interaction.user.id }, { $unset: { paymenter: 1 } });
                    return interaction.reply({
                        content: "Your API key has been deleted successfully.",
                        flags: discord_js_1.MessageFlags.Ephemeral
                    });
                }
                default:
                    return interaction.reply({
                        content: "Invalid subcommand in billing-area.",
                        flags: discord_js_1.MessageFlags.Ephemeral
                    });
            }
        }
        // ============== FALLBACK IF GROUP IS UNKNOWN ==============
        default:
            return interaction.reply({
                content: "Invalid command usage.",
                flags: discord_js_1.MessageFlags.Ephemeral
            });
    }
}
exports.options = {
    devOnly: false,
    userPermissions: [],
    botPermissions: [],
    deleted: false,
};
