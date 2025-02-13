import { AttachmentBuilder } from "discord.js";

/**
 * Creates an attachment for Discord from a Buffer
 * @param {string} content - The content of the file
 * @param {string} fileName - The name of the file displayed in Discord
 * @returns {AttachmentBuilder} - A Discord Attachment
 */

export async function createFile (content: string, fileName: string) {
    const buffer = Buffer.from(content, 'utf-8'); // Convert content to Buffer
    return new AttachmentBuilder(buffer, { name: fileName }); // Pass buffer directly
}