import type { CommandData, CommandOptions, SlashCommandProps } from "commandkit";
import {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  MessageFlags,
} from "discord.js";

import fs from "fs";
import path from "path";

/**
 * A helper to recursively load commands from the ../commands folder,
 * skipping the help command itself.
 * 
 * @returns An array of objects { name: string, description: string, fullBuilder: SlashCommandBuilder }
 */
function loadAllCommands(): {
  name: string;
  description: string;
  fullBuilder: SlashCommandBuilder;
}[] {
  const commandsDir = path.join(__dirname, ".."); 

  const loaded: {
    name: string;
    description: string;
    fullBuilder: SlashCommandBuilder;
  }[] = [];

  function readFolder(folderPath: string) {
    const files = fs.readdirSync(folderPath, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(folderPath, file.name);
      if (file.isDirectory()) {
        readFolder(fullPath);
      } else {
        if (file.name.endsWith(".ts") || file.name.endsWith(".js")) {
          if (file.name.toLowerCase().includes("help")) {
            continue;
          }

          try {
            const cmdModule = require(fullPath);
            if (cmdModule?.data) {
              const builder = cmdModule.data as SlashCommandBuilder;
              loaded.push({
                name: builder.name,
                description: builder.description,
                fullBuilder: builder,
              });
            }
          } catch {
          }
        }
      }
    }
  }

  readFolder(commandsDir);
  return loaded;
}

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Displays all commands in this bot.");

export async function run({ interaction }: SlashCommandProps) {
  // 1) Load all commands from ../commands
  const commands = loadAllCommands(); // each has name, description, fullBuilder

  // If no commands found, respond with an error
  if (!commands.length) {
    return interaction.reply({
      content: "No commands found in the ../commands folder.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // 2) Build the base embed
  const baseEmbed = new EmbedBuilder()
    .setTitle("Help Menu")
    .setDescription("Click a button below to see details about a specific command.")
    .setFooter({ text: "Buttons remain active for 2 minutes." });

  // 3) Create one button per command, up to 5 in a row
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  let currentRow = new ActionRowBuilder<ButtonBuilder>();

  commands.forEach((cmd, index) => {
    const button = new ButtonBuilder()
      .setCustomId(`help_${cmd.name}`)
      .setLabel(`/${cmd.name}`)
      .setStyle(ButtonStyle.Primary);

    currentRow.addComponents(button);
    if ((index + 1) % 5 === 0) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder<ButtonBuilder>();
    }
  });

  if (currentRow.components.length > 0) {
    rows.push(currentRow);
  }

  const msg = await interaction.reply({
    embeds: [baseEmbed],
    components: rows,
    flags: MessageFlags.Ephemeral, 
  });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 2 * 60_000,
    filter: (i) => i.user.id === interaction.user.id,
  });

  collector.on("collect", async (btnInt) => {
    const customId = btnInt.customId; 
    if (!customId.startsWith("help_")) return;

    const cmdName = customId.slice("help_".length);
    const cmdFound = commands.find((c) => c.name === cmdName);
    if (!cmdFound) {
      return btnInt.reply({
        content: `Command "/${cmdName}" not found.`,
        flags: MessageFlags.Ephemeral,
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

export const options: CommandOptions = {
  devOnly: false,
  userPermissions: [],
  botPermissions: [],
  deleted: false,
};

/**
 * Builds a detail embed for the given SlashCommandBuilder
 * listing subcommand groups, subcommands, and any normal options.
 */
function buildCommandDetailEmbed(builder: SlashCommandBuilder): EmbedBuilder {
  const cmdJSON = builder.toJSON();

  const name = cmdJSON.name;
  const description = cmdJSON.description;

  const embed = new EmbedBuilder()
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
          .map(
            (sc) => `   • **/${name} ${g.name} ${sc.name}** – ${sc.description}`
          )
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
      const lines = subCommands.map(
        (sc) => `• **/${name} ${sc.name}** – ${sc.description}`
      );
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
