"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const configPath = path_1.default.join(process.cwd(), "config.json");
const raw = fs_1.default.readFileSync(configPath, "utf8");
const config = JSON.parse(raw);
exports.default = config;
