import { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    WebhookClient, 
    MessageFlags, 
    TextChannel, 
    ThreadAutoArchiveDuration
} from "discord.js";
import config from "../../helpers/config";
import { SlashCommandProps } from "commandkit";

export const data = new SlashCommandBuilder()
    .setName("feature-request")
    .setDescription("Request a feature")
    .addStringOption(o => o
        .setName("type")
        .setDescription("Where do you want to see this feature?")
        .setRequired(true)
        .addChoices(
            { name: "Panel", value: "Panel" },
            { name: "Billing", value: "Billing" },
            { name: "Website", value: "Website" },
            { name: "General", value: "General" },
            { name: "Other", value: "Other" }
        )
    )
    .addStringOption(o => o
        .setName("title")
        .setDescription("The title of your feature request")
        .setRequired(true)
        .setMaxLength(24)
    )
    .addStringOption(o => o
        .setName("description")
        .setDescription("The description of your feature request")
        .setRequired(true)
    );

export async function run({ interaction, client }: SlashCommandProps) {
    try {
        const webhook = config.webhooks.feature_requests;
        const wh = new WebhookClient({ url: webhook });

        const pingRole = config.ids.pings.feature_requests;

        const title: string = interaction.options.getString("title") as string;
        const desc: string = interaction.options.getString("description") as string;
        const type: string = interaction.options.getString("type") as "Other" | "Panel" | "Billing" | "Website" | "General";

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(desc)
            .addFields(
                { name: "Type", value: type, inline: false },
                { name: "Requested by", value: `${interaction.user}`, inline: false }
            );

        const content = `<@&${pingRole}> \nA new feature request has been submitted!`;

        const sentMessage = await wh.send({
            content: content,
            embeds: [embed]
        });

        const channel = await client.channels.fetch(config.channels.feature_requests) as TextChannel;
        if (!channel) {
            return await interaction.reply({
                content: "Could not find the feature request channel.",
                flags: MessageFlags.Ephemeral
            });
        }

        const fetchedMessages = await channel.messages.fetch({ limit: 1 });
        const message = fetchedMessages.first();

        if (message) {
            await message.react("👍"); 
            await message.react("👎"); 
            await message.startThread({
                name: title,
                autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
                reason: desc
            });
        }

        await interaction.reply({
            content: "Your feature request has been submitted!",
            flags: MessageFlags.Ephemeral
        });

    } catch (error) {
        console.error("Error handling feature request:", error);
        await interaction.reply({
            content: "An error occurred while submitting your request.",
            flags: MessageFlags.Ephemeral
        });
    }
}
