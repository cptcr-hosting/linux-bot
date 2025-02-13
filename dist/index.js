"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const commandkit_1 = require("commandkit");
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
// @ts-ignore: 2835
const config_json_1 = __importDefault(require("../config.json"));
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent
    ]
});
new commandkit_1.CommandKit({
    client,
    commandsPath: path_1.default.join(__dirname, "commands"),
    eventsPath: path_1.default.join(__dirname, "events"),
    validationsPath: path_1.default.join(__dirname, "validations"),
    devGuildIds: config_json_1.default.ids.devGuilds,
    devUserIds: config_json_1.default.ids.devUsers,
    devRoleIds: config_json_1.default.ids.devRoles,
    skipBuiltInValidations: true,
    bulkRegister: true
});
(async () => {
    console.log("Connecting to MongoDB database...");
    try {
        await mongoose_1.default.connect(config_json_1.default.mongoose);
    }
    catch (err) {
        const error = `${err}`;
        throw Error(error);
    }
    console.log("MongoDB Connection stable!");
    console.log("Logging in with discord client...");
    try {
        client.login(config_json_1.default.token);
    }
    catch (err) {
        const error = `${err}`;
        throw Error(error);
    }
    console.log("Client ready!");
})();
