"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.run = run;
const discord_js_1 = require("discord.js");
const config_1 = __importDefault(require("../../helpers/config"));
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("feature-request")
    .setDescription("Request a feature")
    .addStringOption(o => o
    .setName("type")
    .setDescription("Where do you want to see this feature?")
    .setRequired(true)
    .addChoices({ name: "Panel", value: "Panel" }, { name: "Billing", value: "Billing" }, { name: "Website", value: "Website" }, { name: "General", value: "General" }, { name: "Other", value: "Other" }))
    .addStringOption(o => o
    .setName("title")
    .setDescription("The title of your feature request")
    .setRequired(true)
    .setMaxLength(24))
    .addStringOption(o => o
    .setName("description")
    .setDescription("The description of your feature request")
    .setRequired(true));
async function run({ interaction, client }) {
    try {
        const webhook = config_1.default.webhooks.feature_requests;
        const wh = new discord_js_1.WebhookClient({ url: webhook });
        const pingRole = config_1.default.ids.pings.feature_requests;
        const title = interaction.options.getString("title");
        const desc = interaction.options.getString("description");
        const type = interaction.options.getString("type");
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(title)
            .setDescription(desc)
            .addFields({ name: "Type", value: type, inline: false }, { name: "Requested by", value: `${interaction.user}`, inline: false });
        const content = `<@&${pingRole}> \nA new feature request has been submitted!`;
        const sentMessage = await wh.send({
            content: content,
            embeds: [embed]
        });
        const channel = await client.channels.fetch(config_1.default.channels.feature_requests);
        if (!channel) {
            return await interaction.reply({
                content: "Could not find the feature request channel.",
                flags: discord_js_1.MessageFlags.Ephemeral
            });
        }
        const fetchedMessages = await channel.messages.fetch({ limit: 1 });
        const message = fetchedMessages.first();
        if (message) {
            await message.react("👍");
            await message.react("👎");
            await message.startThread({
                name: title,
                autoArchiveDuration: discord_js_1.ThreadAutoArchiveDuration.OneWeek,
                reason: desc
            });
        }
        await interaction.reply({
            content: "Your feature request has been submitted!",
            flags: discord_js_1.MessageFlags.Ephemeral
        });
    }
    catch (error) {
        console.error("Error handling feature request:", error);
        await interaction.reply({
            content: "An error occurred while submitting your request.",
            flags: discord_js_1.MessageFlags.Ephemeral
        });
    }
}
