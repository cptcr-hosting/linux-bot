import { Client, GatewayIntentBits } from "discord.js";
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
    devGuildIds: config.ids.devGuilds,
    devUserIds: config.ids.devUsers,
    devRoleIds: config.ids.devRoles,
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
