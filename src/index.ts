import { Client, Embed, EmbedBuilder, GatewayIntentBits, TextChannel } from "discord.js";
import { CommandKit } from "commandkit";
import path from "path";
import mongoose from "mongoose";
// @ts-ignore: 2835
import config from "../config.json";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

new CommandKit({
    client,
    commandsPath: path.join(__dirname, "commands"),
    eventsPath: path.join(__dirname, "events"),
    validationsPath: path.join(__dirname, "validations"),
    devGuildIds: [],
    devUserIds: [],
    devRoleIds: [],
    skipBuiltInValidations: true,
    bulkRegister: true
});

(async () => {
    console.log("Connecting to MongoDB database...")
    try {
        await mongoose.connect(config.mongoose);
    } catch (err) {
        const error: string = `${err}`
        throw Error(error);
    }
    console.log("MongoDB Connection stable!")
    console.log("Logging in with discord client...")
    try {
        client.login(config.token);
    } catch (err) {
        const error: string = `${err}`
        throw Error(error);
    }
    console.log("Client ready!")
})()


// Define the emojis used in the status messages.
const emojis = {
    online: "<a:online:1339302377546584064>",
    maintenance: "<:maintenance:1339302344109854752>",
    offline: "<a:offline:1339302362761658388>"
  };
  
  // Get the pages and nodes arrays from the configuration.
  const web = config.infrastructure.pages;
  const nodes = config.infrastructure.nodes;
  
  // Maps to track when pages/nodes went down.
  const downPages: Map<string, Date> = new Map();
  const downNodes: Map<string, Date> = new Map();
  
  // The Discord channel ID where notifications will be sent.
  const statusChannelId = '1157585594390687755';
  
  // Helper to format a duration (in milliseconds) into a human-readable string.
  function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  
  /**
   * Checks the status of each web page (online/offline).
   * When a page goes offline, an embed is sent.
   * When a page that was offline comes back online, an embed is sent with the downtime.
   */
  async function checkGeneralStatus() {
    for (const page of web) {
      try {
        const isOnline = await checkStatus(page.url, false);
        const channel = client.channels.cache.get(statusChannelId) as TextChannel;
        if (!channel) continue;
  
        if (!isOnline) {
          // If the page is offline and hasn't been recorded yet, record and notify.
          if (!downPages.has(page.url)) {
            downPages.set(page.url, new Date());
            const embed = new EmbedBuilder()
              .setTitle('Page Offline Detected')
              .setDescription(`**URL:** ${page.url}\n**Status:** ${emojis.offline} Offline`)
              .setColor('Red')
              .setTimestamp(new Date());
            await channel.send({ embeds: [embed] });
          }
        } else {
          // If the page was offline but is now online, send recovery embed with downtime.
          if (downPages.has(page.url)) {
            const downSince = downPages.get(page.url)!;
            const downtimeMs = Date.now() - downSince.getTime();
            const embed = new EmbedBuilder()
              .setTitle('Page Back Online')
              .setDescription(
                `**URL:** ${page.url}\n**Status:** ${emojis.online} Online\n**Downtime:** ${formatDuration(downtimeMs)}`
              )
              .setColor('Green')
              .setTimestamp(new Date());
            await channel.send({ embeds: [embed] });
            downPages.delete(page.url);
          }
        }
      } catch (error) {
        console.error(`Error checking page ${page.name}:`, error);
        // On error, treat as offline if not already noted.
        if (!downPages.has(page.url)) {
          downPages.set(page.url, new Date());
          const channel = client.channels.cache.get(statusChannelId) as TextChannel;
          if (channel) {
            const embed = new EmbedBuilder()
              .setTitle('Page Offline Detected')
              .setDescription(`**URL:** ${page.url}\n**Status:** ${emojis.offline} Offline`)
              .setColor('Red')
              .setTimestamp(new Date());
            await channel.send({ embeds: [embed] });
          }
        }
      }
    }
  }
  
  /**
   * Checks each node’s status for maintenance mode.
   * When a node enters maintenance mode, an embed is sent.
   * When a node leaves maintenance mode, an embed is sent with the maintenance duration.
   */
  async function checkNodeStatus(debug: boolean) {
    for (const node of nodes) {
      try {
        const response = await fetch(`${config.panel}/api/application/nodes/${node.identifier}`, {
          method: 'GET',
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
  
        const channel = client.channels.cache.get(statusChannelId) as TextChannel;
        if (!channel) continue;
  
        // Only care about maintenance mode.
        if (data.attributes && data.attributes.maintenance_mode) {
          if (!downNodes.has(node.url)) {
            downNodes.set(node.url, new Date());
            const embed = new EmbedBuilder()
              .setTitle('Node Maintenance Detected')
              .setDescription(`**Name:** ${node.name}\n**URL:** ${node.url}\n**Status:** ${emojis.maintenance} Maintenance`)
              .setColor('Red')
              .setTimestamp(new Date());
            await channel.send({ embeds: [embed] });
          }
        } else {
          // If node was in maintenance and now is not, send recovery embed.
          if (downNodes.has(node.url)) {
            const downSince = downNodes.get(node.url)!;
            const downtimeMs = Date.now() - downSince.getTime();
            const embed = new EmbedBuilder()
              .setTitle('Node Back Online')
              .setDescription(
                `**Name:** ${node.name}\n**URL:** ${node.url}\n**Status:** ${emojis.online} Online\n**Maintenance Duration:** ${formatDuration(downtimeMs)}`
              )
              .setColor('Green')
              .setTimestamp(new Date());
            await channel.send({ embeds: [embed] });
            downNodes.delete(node.url);
          }
        }
      } catch (error) {
        console.error(`Error checking node ${node.name}:`, error);
        // If an error occurs, you might decide to log it without sending an embed.
      }
    }
  }
  
  /**
   * Checks the status of a given URL.
   * Returns true if the request succeeds, otherwise false.
   */
  async function checkStatus(url: string, debug: boolean): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (debug) {
        console.log(response);
      }
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // When the client is ready, start the monitoring loop.
  client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}`);
  
    // Every minute, check both pages and nodes.
    setInterval(() => {
      checkGeneralStatus();
      checkNodeStatus(false);
    }, 60000);
  });