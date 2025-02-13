"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFile = createFile;
const discord_js_1 = require("discord.js");
/**
 * Creates an attachment for Discord from a Buffer
 * @param {string} content - The content of the file
 * @param {string} fileName - The name of the file displayed in Discord
 * @returns {AttachmentBuilder} - A Discord Attachment
 */
async function createFile(content, fileName) {
    const buffer = Buffer.from(content, 'utf-8'); // Convert content to Buffer
    return new discord_js_1.AttachmentBuilder(buffer, { name: fileName }); // Pass buffer directly
}
