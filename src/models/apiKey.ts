import { model, Schema } from "mongoose";

const schema = new Schema({
    userId: String,
    paymenter: String,
    pterodactyl: String
});

export default model("api_data", schema);