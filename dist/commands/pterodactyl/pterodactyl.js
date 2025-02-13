"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.options = exports.data = void 0;
exports.run = run;
exports.modalSubmit = modalSubmit;
exports.autocomplete = autocomplete;
const discord_js_1 = require("discord.js");
// Use discord.js types for autocomplete and modal submissions
// Adjust these imports to match your project’s structure.
const apiKey_1 = __importDefault(require("../../models/apiKey"));
const config_1 = __importDefault(require("../../helpers/config"));
const panel = config_1.default.panel; // Your Pterodactyl panel URL
// ──────────────────────────────────────────────────────────────
// COMMAND DEFINITION WITH SUBCOMMANDS & AUTOCOMPLETE OPTIONS
// ──────────────────────────────────────────────────────────────
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName("server")
    .setDescription("Manage your Pterodactyl server")
    .addSubcommand((sub) => sub
    .setName("advanced")
    .setDescription("Display the interactive advanced management menu"))
    .addSubcommand((sub) => sub
    .setName("rename")
    .setDescription("Rename your server")
    .addStringOption((opt) => opt
    .setName("server")
    .setDescription("Select a server")
    .setRequired(true)
    .setAutocomplete(true))
    .addStringOption((opt) => opt.setName("new_name").setDescription("New server name").setRequired(true)))
    .addSubcommand((sub) => sub
    .setName("list-vars")
    .setDescription("List startup variables")
    .addStringOption((opt) => opt
    .setName("server")
    .setDescription("Select a server")
    .setRequired(true)
    .setAutocomplete(true)))
    .addSubcommand((sub) => sub
    .setName("show-ports")
    .setDescription("Show server ports (allocations)")
    .addStringOption((opt) => opt
    .setName("server")
    .setDescription("Select a server")
    .setRequired(true)
    .setAutocomplete(true)))
    .addSubcommand((sub) => sub
    .setName("live-graph")
    .setDescription("Display a live usage graph (auto-refresh)")
    .addStringOption((opt) => opt
    .setName("server")
    .setDescription("Select a server")
    .setRequired(true)
    .setAutocomplete(true)))
    .addSubcommand((sub) => sub
    .setName("list-schedules")
    .setDescription("List server schedules")
    .addStringOption((opt) => opt
    .setName("server")
    .setDescription("Select a server")
    .setRequired(true)
    .setAutocomplete(true)))
    .addSubcommand((sub) => sub
    .setName("upload")
    .setDescription("Upload a file to your server")
    .addStringOption((opt) => opt
    .setName("server")
    .setDescription("Select a server")
    .setRequired(true)
    .setAutocomplete(true))
    .addAttachmentOption((opt) => opt.setName("file").setDescription("File to upload").setRequired(true)));
// ──────────────────────────────────────────────────────────────
// MAIN COMMAND HANDLER
// ──────────────────────────────────────────────────────────────
async function run({ interaction }) {
    const subcommand = interaction.options.getSubcommand();
    const userData = await apiKey_1.default.findOne({ userId: interaction.user.id });
    const apiKey = userData?.pterodactyl;
    if (!apiKey) {
        return interaction.reply({
            content: "No stored Pterodactyl API key. Use `/api pterodactyl add` first.",
            flags: discord_js_1.MessageFlags.Ephemeral,
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
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
    }
}
// ──────────────────────────────────────────────────────────────
// ADVANCED MENU (Interactive UI)
// ──────────────────────────────────────────────────────────────
async function advancedMenu(interaction, apiKey) {
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
    }
    catch (err) {
        return interaction.reply({
            content: "Error fetching servers.",
            flags: discord_js_1.MessageFlags.Ephemeral,
        });
    }
    const options = servers.map((s) => new discord_js_1.StringSelectMenuOptionBuilder()
        .setLabel(s.attributes.name)
        .setValue(s.attributes.identifier));
    const menu = new discord_js_1.StringSelectMenuBuilder()
        .setCustomId("advanced_server_select")
        .setPlaceholder("Select a server for advanced management")
        .addOptions(options.slice(0, 25));
    const row = new discord_js_1.ActionRowBuilder().addComponents(menu);
    await interaction.reply({
        content: "Select a server for advanced management:",
        components: [row],
        flags: discord_js_1.MessageFlags.Ephemeral,
    });
    const reply = await interaction.fetchReply();
    const collector = reply.createMessageComponentCollector({
        componentType: discord_js_1.ComponentType.StringSelect,
        time: 60000,
        filter: (i) => i.user.id === interaction.user.id,
    });
    collector.on("collect", async (i) => {
        await i.deferUpdate();
        const serverId = i.values[0];
        collector.stop();
        await advancedServerMenu(i, serverId, apiKey);
    });
}
// Shows a secondary advanced options menu for the selected server.
async function advancedServerMenu(interaction, serverId, apiKey) {
    const usage = await fetchServerUsage(serverId, apiKey);
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle("Advanced Server Options")
        .setDescription("Select an option below:")
        .setFooter({ text: `Server ID: ${serverId}` });
    const menu = new discord_js_1.StringSelectMenuBuilder()
        .setCustomId(`advanced_options_${serverId}`)
        .setPlaceholder("Choose an option")
        .addOptions(new discord_js_1.StringSelectMenuOptionBuilder().setLabel("View Usage Graph").setValue("view_usage_graph"), new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Create Backup").setValue("create_backup"), new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Reinstall Server").setValue("reinstall"), new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Rename Server").setValue("rename_server"), new discord_js_1.StringSelectMenuOptionBuilder().setLabel("List Variables").setValue("list_vars"), new discord_js_1.StringSelectMenuOptionBuilder().setLabel("List Users").setValue("list_users"), new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Show Ports").setValue("show_ports"), new discord_js_1.StringSelectMenuOptionBuilder().setLabel("List Schedules").setValue("list_schedules"), new discord_js_1.StringSelectMenuOptionBuilder().setLabel("View Logs").setValue("view_logs"), new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Set Auto Refresh").setValue("set_auto_refresh"), new discord_js_1.StringSelectMenuOptionBuilder().setLabel("Export Metrics").setValue("export_metrics"));
    const row = new discord_js_1.ActionRowBuilder().addComponents(menu);
    await interaction.editReply({ embeds: [embed], components: [row] });
    const reply = await interaction.fetchReply();
    const collectorAdv = reply.createMessageComponentCollector({
        componentType: discord_js_1.ComponentType.StringSelect,
        time: 120000,
        filter: (i) => i.user.id === interaction.user.id,
    });
    collectorAdv.on("collect", async (i) => {
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
async function renameCommand(interaction, apiKey) {
    const serverId = interaction.options.getString("server");
    const newName = interaction.options.getString("new_name");
    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
    await renameServer(interaction, serverId, newName, apiKey);
}
// ──────────────────────────────────────────────────────────────
// SUBCOMMAND: list-vars (List Startup Variables)
// ──────────────────────────────────────────────────────────────
async function listVarsCommand(interaction, apiKey) {
    const serverId = interaction.options.getString("server");
    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
    await handleListVars(interaction, serverId, apiKey);
}
// ──────────────────────────────────────────────────────────────
// SUBCOMMAND: show-ports
// ──────────────────────────────────────────────────────────────
async function showPortsCommand(interaction, apiKey) {
    const serverId = interaction.options.getString("server");
    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
    await handleListAllocations(interaction, serverId, apiKey);
}
// ──────────────────────────────────────────────────────────────
// SUBCOMMAND: live-graph (Auto-refresh live usage graph)
// ──────────────────────────────────────────────────────────────
async function liveGraphCommand(interaction, apiKey) {
    const serverId = interaction.options.getString("server");
    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
    await handleSetAutoRefresh(interaction, serverId, apiKey);
}
// ──────────────────────────────────────────────────────────────
// SUBCOMMAND: list-schedules
// ──────────────────────────────────────────────────────────────
async function listSchedulesCommand(interaction, apiKey) {
    const serverId = interaction.options.getString("server");
    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
    await handleListSchedules(interaction, serverId, apiKey);
}
// ──────────────────────────────────────────────────────────────
// SUBCOMMAND: upload
// ──────────────────────────────────────────────────────────────
async function uploadCommand(interaction, apiKey) {
    const serverId = interaction.options.getString("server");
    const fileAttachment = interaction.options.getAttachment("file");
    await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
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
        if (!uploadResp.ok)
            throw new Error(`HTTP ${uploadResp.status}`);
        await interaction.editReply({ content: `File uploaded successfully.` });
    }
    catch (err) {
        await interaction.editReply({ content: `Error uploading file: ${err.message}` });
    }
}
// ──────────────────────────────────────────────────────────────
// REUSED FUNCTIONS
// ──────────────────────────────────────────────────────────────
async function handleViewUsageGraph(interaction, serverId, apiKey) {
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
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle("Server Usage Graph")
        .setDescription("Graph displaying CPU, RAM, and Network (In/Out) usage")
        .setImage(chartUrl)
        .setFooter({ text: `Server ID: ${serverId}` });
    await interaction.editReply({ embeds: [embed] });
}
async function handleCreateBackup(interaction, serverId, apiKey) {
    try {
        const infoResp = await fetch(`${panel}/api/client/servers/${serverId}`, {
            headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        });
        if (!infoResp.ok)
            throw new Error(`HTTP ${infoResp.status}`);
        const infoJson = await infoResp.json();
        const info = infoJson.attributes;
        const backupResp = await fetch(`${panel}/api/client/servers/${serverId}/backups`, {
            headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        });
        if (!backupResp.ok)
            throw new Error(`HTTP ${backupResp.status}`);
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
        if (!createResp.ok)
            throw new Error(`HTTP ${createResp.status}`);
        const createJson = await createResp.json();
        const backupId = createJson.attributes.uuid;
        await interaction.editReply({ content: `Backup created: \`${backupId}\`.` });
    }
    catch (err) {
        await interaction.editReply({ content: `Error creating backup: ${err.message}` });
    }
}
async function handleReinstall(interaction, serverId, apiKey) {
    try {
        const resp = await fetch(`${panel}/api/client/servers/${serverId}/settings/reinstall`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        });
        if (!resp.ok)
            throw new Error(`HTTP ${resp.status}`);
        await interaction.editReply({ content: "Server reinstallation initiated." });
    }
    catch (err) {
        await interaction.editReply({ content: `Error reinstalling server: ${err.message}` });
    }
}
async function handleListVars(interaction, serverId, apiKey) {
    try {
        const resp = await fetch(`${panel}/api/client/servers/${serverId}/startup`, {
            headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        });
        if (!resp.ok)
            throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const vars = json.variables || [];
        if (!vars.length) {
            return interaction.editReply({ content: "No startup variables found." });
        }
        const list = vars
            .map((v) => `**${v.env_variable}**: \`${v.server_value || v.default_value}\``)
            .join("\n");
        await interaction.editReply({ content: `Startup Variables:\n${list}` });
    }
    catch (err) {
        await interaction.editReply({ content: `Error listing startup variables: ${err.message}` });
    }
}
async function handleListUsers(interaction, serverId, apiKey) {
    try {
        const resp = await fetch(`${panel}/api/client/servers/${serverId}/users`, {
            headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        });
        if (!resp.ok)
            throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const users = json.data || [];
        if (!users.length) {
            return interaction.editReply({ content: "No subusers found." });
        }
        const list = users.map((u) => u.attributes.email).join("\n");
        await interaction.editReply({ content: `Subusers:\n${list}` });
    }
    catch (err) {
        await interaction.editReply({ content: `Error listing subusers: ${err.message}` });
    }
}
async function handleListAllocations(interaction, serverId, apiKey) {
    try {
        const resp = await fetch(`${panel}/api/client/servers/${serverId}/network`, {
            headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        });
        if (!resp.ok)
            throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const allocs = json.data || [];
        if (!allocs.length) {
            return interaction.editReply({ content: "No allocations found." });
        }
        const list = allocs
            .map((a) => {
            const attr = a.attributes;
            return `\`${attr.ip}:${attr.port}\``;
        })
            .join("\n");
        await interaction.editReply({ content: `Allocations:\n${list}` });
    }
    catch (err) {
        await interaction.editReply({ content: `Error listing allocations: ${err.message}` });
    }
}
async function handleListSchedules(interaction, serverId, apiKey) {
    try {
        const resp = await fetch(`${panel}/api/client/servers/${serverId}/schedules`, {
            headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        });
        if (!resp.ok)
            throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const schedules = json.data || [];
        if (!schedules.length) {
            return interaction.editReply({ content: "No schedules found." });
        }
        const list = schedules
            .map((s) => {
            const attr = s.attributes;
            return `**${attr.name}** (cron: \`${attr.cron_minute} ${attr.cron_hour} ${attr.cron_day} ${attr.cron_month}\`)`;
        })
            .join("\n");
        await interaction.editReply({ content: `Schedules:\n${list}` });
    }
    catch (err) {
        await interaction.editReply({ content: `Error listing schedules: ${err.message}` });
    }
}
async function handleSetAutoRefresh(interaction, serverId, apiKey) {
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
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle("Server Usage Graph (Auto-Refresh)")
            .setImage(chartUrl)
            .setFooter({ text: `Server ID: ${serverId}` });
        try {
            await interaction.editReply({ embeds: [embed] });
        }
        catch { }
    }, 30000);
    setTimeout(async () => {
        clearInterval(interval);
        try {
            await interaction.followUp({ content: "Auto-refresh ended.", flags: discord_js_1.MessageFlags.Ephemeral });
        }
        catch { }
    }, 180000);
}
async function handleExportMetrics(interaction, serverId, apiKey) {
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
        const file = new discord_js_1.AttachmentBuilder(Buffer.from(csvData, "utf-8"), { name: "metrics.csv" });
        await interaction.editReply({ content: "Exported Metrics:", files: [file] });
    }
    catch (err) {
        await interaction.editReply({ content: `Error exporting metrics: ${err.message}` });
    }
}
async function fetchServerUsage(serverId, apiKey) {
    try {
        const resp = await fetch(`${panel}/api/client/servers/${serverId}/resources`, {
            headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        });
        if (!resp.ok)
            return null;
        const json = await resp.json();
        return json.attributes;
    }
    catch {
        return null;
    }
}
// ──────────────────────────────────────────────────────────────
// MODAL SUBMISSION HANDLING (For Rename/Update Variable)
// ──────────────────────────────────────────────────────────────
async function modalSubmit(interaction) {
    if (!interaction.isModalSubmit())
        return;
    const userData = await apiKey_1.default.findOne({ userId: interaction.user.id });
    const key = userData?.pterodactyl;
    if (!key) {
        return interaction.reply({ content: "No stored API key found.", flags: discord_js_1.MessageFlags.Ephemeral });
    }
    // Handle Rename Modal
    if (interaction.customId.startsWith("renameModal_")) {
        const serverId = interaction.customId.split("_")[1];
        const newName = interaction.fields.getTextInputValue("renameInput");
        await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        await renameServer(interaction, serverId, newName, key);
    }
    // Handle Update Variable Modal
    else if (interaction.customId.startsWith("updateVarModal_")) {
        const parts = interaction.customId.split("_");
        const serverId = parts[1];
        const envVar = parts[2];
        const newVal = interaction.fields.getTextInputValue("updateVarInput");
        await interaction.deferReply({ flags: discord_js_1.MessageFlags.Ephemeral });
        await updateVariable(interaction, serverId, envVar, newVal, key);
    }
}
async function showRenameModal(interaction, serverId) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId(`renameModal_${serverId}`)
        .setTitle("Rename Server");
    const input = new discord_js_1.TextInputBuilder()
        .setCustomId("renameInput")
        .setLabel("New Server Name")
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const row = new discord_js_1.ActionRowBuilder().addComponents(input);
    modal.addComponents(row);
    await interaction.showModal(modal);
}
async function renameServer(interaction, serverId, newName, apiKey) {
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
        if (!resp.ok)
            throw new Error(`HTTP ${resp.status}`);
        await interaction.editReply({ content: `Server renamed to "${newName}".` });
    }
    catch (err) {
        await interaction.editReply({ content: `Error renaming server: ${err.message}` });
    }
}
async function handleUpdateVar(interaction, serverId, apiKey) {
    try {
        const resp = await fetch(`${panel}/api/client/servers/${serverId}/startup`, {
            headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
        });
        if (!resp.ok)
            throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const vars = json.variables || [];
        if (!vars.length) {
            return interaction.editReply({ content: "No variables found." });
        }
        const options = vars.map((v) => new discord_js_1.StringSelectMenuOptionBuilder().setLabel(v.env_variable).setValue(v.env_variable));
        const select = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId(`updateVarSelect_${serverId}`)
            .setPlaceholder("Select a variable to update")
            .addOptions(options);
        const row = new discord_js_1.ActionRowBuilder().addComponents(select);
        await interaction.editReply({ content: "Select a variable to update:", components: [row] });
        const msg = await interaction.fetchReply();
        const collector = msg.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.StringSelect,
            time: 60000,
            filter: (i) => i.user.id === interaction.user.id,
        });
        collector.on("collect", async (i) => {
            const envVar = i.values[0];
            collector.stop();
            await showUpdateVarModal(i, serverId, envVar);
        });
        collector.on("end", async () => {
            try {
                await interaction.editReply({ components: [] });
            }
            catch { }
        });
    }
    catch (err) {
        await interaction.editReply({ content: `Error updating variable: ${err.message}` });
    }
}
async function showUpdateVarModal(interaction, serverId, envVar) {
    const modal = new discord_js_1.ModalBuilder()
        .setCustomId(`updateVarModal_${serverId}_${envVar}`)
        .setTitle(`Update Variable: ${envVar}`);
    const input = new discord_js_1.TextInputBuilder()
        .setCustomId("updateVarInput")
        .setLabel("New Value")
        .setStyle(discord_js_1.TextInputStyle.Short)
        .setRequired(true);
    const row = new discord_js_1.ActionRowBuilder().addComponents(input);
    modal.addComponents(row);
    await interaction.showModal(modal);
}
async function updateVariable(interaction, serverId, envVar, newVal, apiKey) {
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
        if (!resp.ok)
            throw new Error(`HTTP ${resp.status}`);
        await interaction.editReply({ content: `Variable \`${envVar}\` updated to \`${newVal}\`.` });
    }
    catch (err) {
        await interaction.editReply({ content: `Error updating variable: ${err.message}` });
    }
}
exports.options = {
    devOnly: false,
    userPermissions: [],
    botPermissions: [],
    deleted: false,
};
async function autocomplete(interaction) {
    console.log("Autocomplete triggered");
    console.log("User object:", interaction.user);
    // Retrieve the user's API key.
    const userData = await apiKey_1.default.findOne({ userId: interaction.user.id });
    const apiKey = userData?.pterodactyl;
    if (!apiKey) {
        console.log("No API key found for user", interaction.user.id);
        try {
            // AutocompleteInteraction only supports respond().
            await interaction.respond([]);
        }
        catch (err) {
            console.error("Error responding in autocomplete:", err);
        }
        return;
    }
    let servers = [];
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
    }
    catch (err) {
        console.error("Error fetching servers:", err);
    }
    // Get the currently focused autocomplete input.
    const focused = interaction.options.getFocused() || "";
    // Map servers to autocomplete options.
    const options = servers
        .map((s) => {
        const id = s.attributes.identifier;
        const name = s.attributes.name;
        return { name, value: id };
    })
        .filter((opt) => opt.name.toLowerCase().includes(focused.toLowerCase()))
        .slice(0, 25);
    console.log("Autocomplete options:", options);
    // Use the respond() method to return options.
    try {
        if (typeof interaction.respond === "function") {
            await interaction.respond(options);
        }
        else {
            console.error("respond() method is not available on the interaction.");
        }
    }
    catch (err) {
        console.error("Error in autocomplete respond:", err);
    }
}
