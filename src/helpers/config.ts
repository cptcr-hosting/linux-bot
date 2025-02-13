import fs from "fs";
import path from "path";

const configPath = path.join(process.cwd(), "config.json");
const raw = fs.readFileSync(configPath, "utf8");
const config = JSON.parse(raw);
export default config;