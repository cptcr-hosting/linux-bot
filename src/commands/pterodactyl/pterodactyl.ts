import type { 
  CommandData, 
  CommandOptions, 
  SlashCommandProps 
} from "commandkit";
import {
  ModalSubmitInteraction,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  ComponentType,
  MessageFlags,
  StringSelectMenuInteraction,
  ButtonInteraction,
} from "discord.js";
import { AutocompleteInteraction } from "discord.js";

// Use discord.js types for autocomplete and modal submissions
// Adjust these imports to match your project’s structure.
import schema from "../../models/apiKey";
import config from "../../helpers/config";

const panel = config.panel; // Your Pterodactyl panel URL

// ──────────────────────────────────────────────────────────────
// COMMAND DEFINITION WITH SUBCOMMANDS & AUTOCOMPLETE OPTIONS
// ──────────────────────────────────────────────────────────────
export const data = new SlashCommandBuilder()
  .setName("server")
  .setDescription("Manage your Pterodactyl server")
  .addSubcommand((sub) =>
    sub
      .setName("advanced")
      .setDescription("Display the interactive advanced management menu")
  )
  .addSubcommand((sub) =>
    sub
      .setName("rename")
      .setDescription("Rename your server")
      .addStringOption((opt: any) =>
        opt
          .setName("server")
          .setDescription("Select a server")
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addStringOption((opt: any) =>
        opt.setName("new_name").setDescription("New server name").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("list-vars")
      .setDescription("List startup variables")
      .addStringOption((opt: any) =>
        opt
          .setName("server")
          .setDescription("Select a server")
          .setRequired(true)
          .setAutocomplete(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("show-ports")
      .setDescription("Show server ports (allocations)")
      .addStringOption((opt: any) =>
        opt
          .setName("server")
          .setDescription("Select a server")
          .setRequired(true)
          .setAutocomplete(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("live-graph")
      .setDescription("Display a live usage graph (auto-refresh)")
      .addStringOption((opt: any) =>
        opt
          .setName("server")
          .setDescription("Select a server")
          .setRequired(true)
          .setAutocomplete(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("list-schedules")
      .setDescription("List server schedules")
      .addStringOption((opt: any) =>
        opt
          .setName("server")
          .setDescription("Select a server")
          .setRequired(true)
          .setAutocomplete(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("upload")
      .setDescription("Upload a file to your server")
      .addStringOption((opt: any) =>
        opt
          .setName("server")
          .setDescription("Select a server")
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addAttachmentOption((opt: any) =>
        opt.setName("file").setDescription("File to upload").setRequired(true)
      )
  );

// ──────────────────────────────────────────────────────────────
// MAIN COMMAND HANDLER
// ──────────────────────────────────────────────────────────────
export async function run({ interaction }: SlashCommandProps) {
  const subcommand = interaction.options.getSubcommand();
  const userData = await schema.findOne({ userId: interaction.user.id });
  const apiKey = userData?.pterodactyl;
  if (!apiKey) {
    return interaction.reply({
      content: "No stored Pterodactyl API key. Use `/api pterodactyl add` first.",
      flags: MessageFlags.Ephemeral,
    });
  }
  switch (subcommand) {
    case "advanced":
      await advancedMenu(interaction, apiKey);
      break;
    case "rename":
      await renameCommand(interaction, apiKey);
      break;
    case "list-vars":
      await listVarsCommand(interaction, apiKey);
      break;
    case "show-ports":
      await showPortsCommand(interaction, apiKey);
      break;
    case "live-graph":
      await liveGraphCommand(interaction, apiKey);
      break;
    case "list-schedules":
      await listSchedulesCommand(interaction, apiKey);
      break;
    case "upload":
      await uploadCommand(interaction, apiKey);
      break;
    default:
      await interaction.reply({
        content: "Unknown subcommand.",
        flags: MessageFlags.Ephemeral,
      });
  }
}

// ──────────────────────────────────────────────────────────────
// ADVANCED MENU (Interactive UI)
// ──────────────────────────────────────────────────────────────
async function advancedMenu(interaction: any, apiKey: string) {
  let servers;
  try {
    const resp = await fetch(`${panel}/api/client`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const json = await resp.json();
    servers = json.data || [];
  } catch (err) {
    return interaction.reply({
      content: "Error fetching servers.",
      flags: MessageFlags.Ephemeral,
    });
  }
  const options = servers.map((s: any) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(s.attributes.name)
      .setValue(s.attributes.identifier)
  );
  const menu = new StringSelectMenuBuilder()
    .setCustomId("advanced_server_select")
    .setPlaceholder("Select a server for advanced management")
    .addOptions(options.slice(0, 25));
  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  await interaction.reply({
    content: "Select a server for advanced management:",
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
  const reply = await interaction.fetchReply();
  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 60000,
    filter: (i: StringSelectMenuInteraction) => i.user.id === interaction.user.id,
  });
  collector.on("collect", async (i: StringSelectMenuInteraction) => {
    await i.deferUpdate();
    const serverId = i.values[0];
    collector.stop();
    await advancedServerMenu(i, serverId, apiKey);
  });
}

// Shows a secondary advanced options menu for the selected server.
async function advancedServerMenu(interaction: any, serverId: string, apiKey: string) {
  const usage = await fetchServerUsage(serverId, apiKey);
  const embed = new EmbedBuilder()
    .setTitle("Advanced Server Options")
    .setDescription("Select an option below:")
    .setFooter({ text: `Server ID: ${serverId}` });
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`advanced_options_${serverId}`)
    .setPlaceholder("Choose an option")
    .addOptions(
      new StringSelectMenuOptionBuilder().setLabel("View Usage Graph").setValue("view_usage_graph"),
      new StringSelectMenuOptionBuilder().setLabel("Create Backup").setValue("create_backup"),
      new StringSelectMenuOptionBuilder().setLabel("Reinstall Server").setValue("reinstall"),
      new StringSelectMenuOptionBuilder().setLabel("Rename Server").setValue("rename_server"),
      new StringSelectMenuOptionBuilder().setLabel("List Variables").setValue("list_vars"),
      new StringSelectMenuOptionBuilder().setLabel("List Users").setValue("list_users"),
      new StringSelectMenuOptionBuilder().setLabel("Show Ports").setValue("show_ports"),
      new StringSelectMenuOptionBuilder().setLabel("List Schedules").setValue("list_schedules"),
      new StringSelectMenuOptionBuilder().setLabel("View Logs").setValue("view_logs"),
      new StringSelectMenuOptionBuilder().setLabel("Set Auto Refresh").setValue("set_auto_refresh"),
      new StringSelectMenuOptionBuilder().setLabel("Export Metrics").setValue("export_metrics")
    );
  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  await interaction.editReply({ embeds: [embed], components: [row] });
  const reply = await interaction.fetchReply();
  const collectorAdv = reply.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 120000,
    filter: (i: StringSelectMenuInteraction) => i.user.id === interaction.user.id,
  });
  collectorAdv.on("collect", async (i: StringSelectMenuInteraction) => {
    await i.deferUpdate();
    const option = i.values[0];
    switch (option) {
      case "view_usage_graph":
        await handleViewUsageGraph(i, serverId, apiKey);
        break;
      case "create_backup":
        await handleCreateBackup(i, serverId, apiKey);
        break;
      case "reinstall":
        await handleReinstall(i, serverId, apiKey);
        break;
      case "rename_server":
        await showRenameModal(i, serverId);
        break;
      case "list_vars":
        await handleListVars(i, serverId, apiKey);
        break;
      case "list_users":
        await handleListUsers(i, serverId, apiKey);
        break;
      case "show_ports":
        await handleListAllocations(i, serverId, apiKey);
        break;
      case "list_schedules":
        await handleListSchedules(i, serverId, apiKey);
        break;
      case "set_auto_refresh":
        await handleSetAutoRefresh(i, serverId, apiKey);
        break;
      case "export_metrics":
        await handleExportMetrics(i, serverId, apiKey);
        break;
      default:
        await i.editReply({ content: "Unknown option selected." });
    }
    collectorAdv.stop();
  });
}

// ──────────────────────────────────────────────────────────────
// SUBCOMMAND: rename
// ──────────────────────────────────────────────────────────────
async function renameCommand(interaction: any, apiKey: string) {
  const serverId = interaction.options.getString("server")!;
  const newName = interaction.options.getString("new_name")!;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await renameServer(interaction, serverId, newName, apiKey);
}

// ──────────────────────────────────────────────────────────────
// SUBCOMMAND: list-vars (List Startup Variables)
// ──────────────────────────────────────────────────────────────
async function listVarsCommand(interaction: any, apiKey: string) {
  const serverId = interaction.options.getString("server")!;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await handleListVars(interaction, serverId, apiKey);
}

// ──────────────────────────────────────────────────────────────
// SUBCOMMAND: show-ports
// ──────────────────────────────────────────────────────────────
async function showPortsCommand(interaction: any, apiKey: string) {
  const serverId = interaction.options.getString("server")!;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await handleListAllocations(interaction, serverId, apiKey);
}

// ──────────────────────────────────────────────────────────────
// SUBCOMMAND: live-graph (Auto-refresh live usage graph)
// ──────────────────────────────────────────────────────────────
async function liveGraphCommand(interaction: any, apiKey: string) {
  const serverId = interaction.options.getString("server")!;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await handleSetAutoRefresh(interaction, serverId, apiKey);
}

// ──────────────────────────────────────────────────────────────
// SUBCOMMAND: list-schedules
// ──────────────────────────────────────────────────────────────
async function listSchedulesCommand(interaction: any, apiKey: string) {
  const serverId = interaction.options.getString("server")!;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await handleListSchedules(interaction, serverId, apiKey);
}

// ──────────────────────────────────────────────────────────────
// SUBCOMMAND: upload
// ──────────────────────────────────────────────────────────────
async function uploadCommand(interaction: any, apiKey: string) {
  const serverId = interaction.options.getString("server")!;
  const fileAttachment = interaction.options.getAttachment("file")!;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const response = await fetch(fileAttachment.url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  try {
    const uploadResp = await fetch(`${panel}/api/client/servers/${serverId}/files/upload?directory=/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/octet-stream",
        Accept: "application/json",
      },
      body: buffer,
    });
    if (!uploadResp.ok) throw new Error(`HTTP ${uploadResp.status}`);
    await interaction.editReply({ content: `File uploaded successfully.` });
  } catch (err: any) {
    await interaction.editReply({ content: `Error uploading file: ${err.message}` });
  }
}

// ──────────────────────────────────────────────────────────────
// REUSED FUNCTIONS
// ──────────────────────────────────────────────────────────────
async function handleViewUsageGraph(
  interaction: StringSelectMenuInteraction | ButtonInteraction,
  serverId: string,
  apiKey: string
) {
  const usage = await fetchServerUsage(serverId, apiKey);
  if (!usage || !usage.resources) {
    return interaction.editReply({ content: "Error fetching server usage data.", components: [] });
  }
  const cpu = usage.resources.cpu_absolute || 0;
  const ram = usage.resources.memory_bytes ? usage.resources.memory_bytes / (1024 * 1024) : 0;
  const netIn = usage.resources.network_in || 0;
  const netOut = usage.resources.network_out || 0;
  const cpuData = Array(6).fill(cpu);
  const ramData = Array(6).fill(ram);
  const netInData = Array(6).fill(netIn);
  const netOutData = Array(6).fill(netOut);
  const chartConfig = {
    type: "line",
    data: {
      labels: ["T1", "T2", "T3", "T4", "T5", "T6"],
      datasets: [
        { label: "CPU Usage (%)", data: cpuData, borderColor: "rgba(255, 99, 132, 1)", fill: false },
        { label: "RAM Usage (MB)", data: ramData, borderColor: "rgba(54, 162, 235, 1)", fill: false },
        { label: "Net In (KB/s)", data: netInData, borderColor: "rgba(255, 206, 86, 1)", fill: false },
        { label: "Net Out (KB/s)", data: netOutData, borderColor: "rgba(75, 192, 192, 1)", fill: false },
      ],
    },
    options: { title: { display: true, text: "Server Usage Graph" }, scales: { y: { beginAtZero: true } } },
  };
  const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
  const embed = new EmbedBuilder()
    .setTitle("Server Usage Graph")
    .setDescription("Graph displaying CPU, RAM, and Network (In/Out) usage")
    .setImage(chartUrl)
    .setFooter({ text: `Server ID: ${serverId}` });
  await interaction.editReply({ embeds: [embed] });
}

async function handleCreateBackup(
  interaction: StringSelectMenuInteraction | ButtonInteraction,
  serverId: string,
  apiKey: string
) {
  try {
    const infoResp = await fetch(`${panel}/api/client/servers/${serverId}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!infoResp.ok) throw new Error(`HTTP ${infoResp.status}`);
    const infoJson = await infoResp.json();
    const info = infoJson.attributes;
    const backupResp = await fetch(`${panel}/api/client/servers/${serverId}/backups`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!backupResp.ok) throw new Error(`HTTP ${backupResp.status}`);
    const backupJson = await backupResp.json();
    const backups = backupJson.data || [];
    const used = backups.length;
    const limit = info.feature_limits?.backups || 0;
    if (limit > 0 && used >= limit) {
      return interaction.editReply({ content: `No backup slots available (${used}/${limit}).` });
    }
    const createResp = await fetch(`${panel}/api/client/servers/${serverId}/backups`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({}),
    });
    if (!createResp.ok) throw new Error(`HTTP ${createResp.status}`);
    const createJson = await createResp.json();
    const backupId = createJson.attributes.uuid;
    await interaction.editReply({ content: `Backup created: \`${backupId}\`.` });
  } catch (err: any) {
    await interaction.editReply({ content: `Error creating backup: ${err.message}` });
  }
}

async function handleReinstall(
  interaction: StringSelectMenuInteraction | ButtonInteraction,
  serverId: string,
  apiKey: string
) {
  try {
    const resp = await fetch(`${panel}/api/client/servers/${serverId}/settings/reinstall`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    await interaction.editReply({ content: "Server reinstallation initiated." });
  } catch (err: any) {
    await interaction.editReply({ content: `Error reinstalling server: ${err.message}` });
  }
}

async function handleListVars(
  interaction: StringSelectMenuInteraction | ButtonInteraction,
  serverId: string,
  apiKey: string
) {
  try {
    const resp = await fetch(`${panel}/api/client/servers/${serverId}/startup`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const vars = json.variables || [];
    if (!vars.length) {
      return interaction.editReply({ content: "No startup variables found." });
    }
    const list = vars
      .map((v: any) => `**${v.env_variable}**: \`${v.server_value || v.default_value}\``)
      .join("\n");
    await interaction.editReply({ content: `Startup Variables:\n${list}` });
  } catch (err: any) {
    await interaction.editReply({ content: `Error listing startup variables: ${err.message}` });
  }
}

async function handleListUsers(
  interaction: StringSelectMenuInteraction | ButtonInteraction,
  serverId: string,
  apiKey: string
) {
  try {
    const resp = await fetch(`${panel}/api/client/servers/${serverId}/users`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const users = json.data || [];
    if (!users.length) {
      return interaction.editReply({ content: "No subusers found." });
    }
    const list = users.map((u: any) => u.attributes.email).join("\n");
    await interaction.editReply({ content: `Subusers:\n${list}` });
  } catch (err: any) {
    await interaction.editReply({ content: `Error listing subusers: ${err.message}` });
  }
}

async function handleListAllocations(
  interaction: StringSelectMenuInteraction | ButtonInteraction,
  serverId: string,
  apiKey: string
) {
  try {
    const resp = await fetch(`${panel}/api/client/servers/${serverId}/network`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const allocs = json.data || [];
    if (!allocs.length) {
      return interaction.editReply({ content: "No allocations found." });
    }
    const list = allocs
      .map((a: any) => {
        const attr = a.attributes;
        return `\`${attr.ip}:${attr.port}\``;
      })
      .join("\n");
    await interaction.editReply({ content: `Allocations:\n${list}` });
  } catch (err: any) {
    await interaction.editReply({ content: `Error listing allocations: ${err.message}` });
  }
}

async function handleListSchedules(
  interaction: StringSelectMenuInteraction | ButtonInteraction,
  serverId: string,
  apiKey: string
) {
  try {
    const resp = await fetch(`${panel}/api/client/servers/${serverId}/schedules`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const schedules = json.data || [];
    if (!schedules.length) {
      return interaction.editReply({ content: "No schedules found." });
    }
    const list = schedules
      .map((s: any) => {
        const attr = s.attributes;
        return `**${attr.name}** (cron: \`${attr.cron_minute} ${attr.cron_hour} ${attr.cron_day} ${attr.cron_month}\`)`;
      })
      .join("\n");
    await interaction.editReply({ content: `Schedules:\n${list}` });
  } catch (err: any) {
    await interaction.editReply({ content: `Error listing schedules: ${err.message}` });
  }
}

async function handleSetAutoRefresh(
  interaction: StringSelectMenuInteraction | ButtonInteraction,
  serverId: string,
  apiKey: string
) {
  await interaction.editReply({
    content: "Auto-refresh enabled for 3 minutes. The usage graph will update every 30 seconds.",
  });
  const interval = setInterval(async () => {
    const usage = await fetchServerUsage(serverId, apiKey);
    const cpu = usage?.resources?.cpu_absolute || 0;
    const ram = usage?.resources?.memory_bytes ? usage.resources.memory_bytes / (1024 * 1024) : 0;
    const netIn = usage?.resources?.network_in || 0;
    const netOut = usage?.resources?.network_out || 0;
    const cpuData = Array(6).fill(cpu);
    const ramData = Array(6).fill(ram);
    const netInData = Array(6).fill(netIn);
    const netOutData = Array(6).fill(netOut);
    const chartConfig = {
      type: "line",
      data: {
        labels: ["T1", "T2", "T3", "T4", "T5", "T6"],
        datasets: [
          { label: "CPU Usage (%)", data: cpuData, borderColor: "rgba(255, 99, 132, 1)", fill: false },
          { label: "RAM Usage (MB)", data: ramData, borderColor: "rgba(54, 162, 235, 1)", fill: false },
          { label: "Net In (KB/s)", data: netInData, borderColor: "rgba(255, 206, 86, 1)", fill: false },
          { label: "Net Out (KB/s)", data: netOutData, borderColor: "rgba(75, 192, 192, 1)", fill: false },
        ],
      },
      options: { title: { display: true, text: "Server Usage Graph (Auto-Refresh)" }, scales: { y: { beginAtZero: true } } },
    };
    const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
    const embed = new EmbedBuilder()
      .setTitle("Server Usage Graph (Auto-Refresh)")
      .setImage(chartUrl)
      .setFooter({ text: `Server ID: ${serverId}` });
    try {
      await interaction.editReply({ embeds: [embed] });
    } catch { }
  }, 30000);
  setTimeout(async () => {
    clearInterval(interval);
    try {
      await interaction.followUp({ content: "Auto-refresh ended.", flags: MessageFlags.Ephemeral });
    } catch { }
  }, 180000);
}

async function handleExportMetrics(
  interaction: StringSelectMenuInteraction | ButtonInteraction,
  serverId: string,
  apiKey: string
) {
  try {
    const usage = await fetchServerUsage(serverId, apiKey);
    if (!usage || !usage.resources) {
      return interaction.editReply({ content: "Error fetching usage data." });
    }
    const cpu = usage.resources.cpu_absolute || 0;
    const ram = usage.resources.memory_bytes ? usage.resources.memory_bytes / (1024 * 1024) : 0;
    const netIn = usage.resources.network_in || 0;
    const netOut = usage.resources.network_out || 0;
    const csvData = `Metric,Value\nCPU Usage (%),${cpu}\nRAM Usage (MB),${ram}\nNetwork In (KB/s),${netIn}\nNetwork Out (KB/s),${netOut}`;
    const file = new AttachmentBuilder(Buffer.from(csvData, "utf-8"), { name: "metrics.csv" });
    await interaction.editReply({ content: "Exported Metrics:", files: [file] });
  } catch (err: any) {
    await interaction.editReply({ content: `Error exporting metrics: ${err.message}` });
  }
}

async function fetchServerUsage(serverId: string, apiKey: string) {
  try {
    const resp = await fetch(`${panel}/api/client/servers/${serverId}/resources`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    return json.attributes;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────
// MODAL SUBMISSION HANDLING (For Rename/Update Variable)
// ──────────────────────────────────────────────────────────────
export async function modalSubmit(interaction: ModalSubmitInteraction) {
  if (!interaction.isModalSubmit()) return;
  const userData = await schema.findOne({ userId: interaction.user.id });
  const key = userData?.pterodactyl;
  if (!key) {
    return interaction.reply({ content: "No stored API key found.", flags: MessageFlags.Ephemeral });
  }
  // Handle Rename Modal
  if (interaction.customId.startsWith("renameModal_")) {
    const serverId = interaction.customId.split("_")[1];
    const newName = interaction.fields.getTextInputValue("renameInput");
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await renameServer(interaction, serverId, newName, key);
  }
  // Handle Update Variable Modal
  else if (interaction.customId.startsWith("updateVarModal_")) {
    const parts = interaction.customId.split("_");
    const serverId = parts[1];
    const envVar = parts[2];
    const newVal = interaction.fields.getTextInputValue("updateVarInput");
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await updateVariable(interaction, serverId, envVar, newVal, key);
  }
}

async function showRenameModal(interaction: StringSelectMenuInteraction | ButtonInteraction, serverId: string) {
  const modal = new ModalBuilder()
    .setCustomId(`renameModal_${serverId}`)
    .setTitle("Rename Server");
  const input = new TextInputBuilder()
    .setCustomId("renameInput")
    .setLabel("New Server Name")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);
  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
  modal.addComponents(row);
  await interaction.showModal(modal);
}

async function renameServer(interaction: any, serverId: string, newName: string, apiKey: string) {
  try {
    const resp = await fetch(`${panel}/api/client/servers/${serverId}/settings`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ name: newName }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    await interaction.editReply({ content: `Server renamed to "${newName}".` });
  } catch (err: any) {
    await interaction.editReply({ content: `Error renaming server: ${err.message}` });
  }
}

async function handleUpdateVar(interaction: StringSelectMenuInteraction | ButtonInteraction, serverId: string, apiKey: string) {
  try {
    const resp = await fetch(`${panel}/api/client/servers/${serverId}/startup`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const vars = json.variables || [];
    if (!vars.length) {
      return interaction.editReply({ content: "No variables found." });
    }
    const options = vars.map((v: any) =>
      new StringSelectMenuOptionBuilder().setLabel(v.env_variable).setValue(v.env_variable)
    );
    const select = new StringSelectMenuBuilder()
      .setCustomId(`updateVarSelect_${serverId}`)
      .setPlaceholder("Select a variable to update")
      .addOptions(options);
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    await interaction.editReply({ content: "Select a variable to update:", components: [row] });
    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60000,
      filter: (i: StringSelectMenuInteraction) => i.user.id === interaction.user.id,
    });
    collector.on("collect", async (i: StringSelectMenuInteraction) => {
      const envVar = i.values[0];
      collector.stop();
      await showUpdateVarModal(i, serverId, envVar);
    });
    collector.on("end", async () => {
      try {
        await interaction.editReply({ components: [] });
      } catch { }
    });
  } catch (err: any) {
    await interaction.editReply({ content: `Error updating variable: ${err.message}` });
  }
}

async function showUpdateVarModal(interaction: StringSelectMenuInteraction | ButtonInteraction, serverId: string, envVar: string) {
  const modal = new ModalBuilder()
    .setCustomId(`updateVarModal_${serverId}_${envVar}`)
    .setTitle(`Update Variable: ${envVar}`);
  const input = new TextInputBuilder()
    .setCustomId("updateVarInput")
    .setLabel("New Value")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);
  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
  modal.addComponents(row);
  await interaction.showModal(modal);
}

async function updateVariable(interaction: any, serverId: string, envVar: string, newVal: string, apiKey: string) {
  try {
    const resp = await fetch(`${panel}/api/client/servers/${serverId}/startup/variable`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ key: envVar, value: newVal }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    await interaction.editReply({ content: `Variable \`${envVar}\` updated to \`${newVal}\`.` });
  } catch (err: any) {
    await interaction.editReply({ content: `Error updating variable: ${err.message}` });
  }
}

export const options: CommandOptions = {
  devOnly: false,
  userPermissions: [],
  botPermissions: [],
  deleted: false,
};

export async function autocomplete(interaction: AutocompleteInteraction) {
  console.log("Autocomplete triggered");
  console.log("User object:", interaction.user);

  // Retrieve the user's API key.
  const userData = await schema.findOne({ userId: interaction.user.id });
  const apiKey = userData?.pterodactyl;
  if (!apiKey) {
    console.log("No API key found for user", interaction.user.id);
    try {
      // AutocompleteInteraction only supports respond().
      await interaction.respond([]);
    } catch (err) {
      console.error("Error responding in autocomplete:", err);
    }
    return;
  }

  let servers: any[] = [];
  try {
    const resp = await fetch(`${panel}/api/client`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const json = await resp.json();
    servers = json.data || [];
    console.log("Fetched servers:", servers);
  } catch (err) {
    console.error("Error fetching servers:", err);
  }

  // Get the currently focused autocomplete input.
  const focused = interaction.options.getFocused() || "";
  // Map servers to autocomplete options.
  const options = servers
    .map((s: any) => {
      const id = s.attributes.identifier;
      const name = s.attributes.name;
      return { name, value: id };
    })
    .filter((opt: { name: string; value: string }) =>
      opt.name.toLowerCase().includes(focused.toLowerCase())
    )
    .slice(0, 25);

  console.log("Autocomplete options:", options);

  // Use the respond() method to return options.
  try {
    if (typeof interaction.respond === "function") {
      await interaction.respond(options);
    } else {
      console.error("respond() method is not available on the interaction.");
    }
  } catch (err) {
    console.error("Error in autocomplete respond:", err);
  }
}