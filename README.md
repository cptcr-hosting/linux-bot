# Linux Bot
Linux Bot is our Open-Source helper bot which interacts with the pterodactyl and paymenter API.

# Requirements
- NodeJS v20 or higher ( https://nodejs.org/en/download )
- Good TypeScript knowledge (for maintaining purposes)
- You may require a hosted [Paymenter](https://paymenter.org) Server to test all features
- You may require a hosted [Pterodactyl](https://pterodactyl.io) 
- A valid MongoDB Connection String

# End-User requirements
- The user requires to have a API Key with all permissions active from the paymenter panel ( https://cptcr.shop/api )
- The user requires to have a API Key from a pterodactyl based panel ( https://panel.cptcr.cc/account/api )

# Installation
1. Download the code using <br>
```bash
git clone https://github.com/CPTCR-Hosting/linux-bot
```
2. Install all dependencies <br>
```bash
npm install
```
3. Setup the bot <br>
Create a config.json file in the root directory with the following content: <br>
```json
{
    "mongoose": "", // Your MongoDB connection string
    "panel": "", // Pterodactyl Panel (e.g. https://panel.cptcr.cc )
    "billing": "", // Paymenter Shop (e.g. https://cptcr.shop )
    "token": "", // Your discord bot token
    "panelAdminApiKey": "", // A Pterodactyl Admin Key (panel.domain.com/admin/api)
    "infrastructure": {
        "nodes": [
            {
                "name": "", // Display name
                "identifier": 1, // Node identifier ( https://panel.domain.com/admin/nodes/view/IDENTIFIER_IS_HERE/) must be a number
                "url": "https://node.domain.com" // Node url (e.g. nl1.node.cptcr.cc)
            }
        ],
        "pages": [
            {
                "name": "", // Display name
                "url": "https://domain.com" // URL of the website to check
            }
        ]
    }
}
```
4. Compile the files to JS <br>
```bash
npm run build
```
5. Start the bot <br>
```bash
npm run start
```
6. Get a list of all commands <br>
Display all commands by simply typing `/help` into the discord server. (The help command will automatically display all commands and all future added commands)

# Tools used
- NodeJS - https://nodejs.org/ <br>
Node.js® is a free, open-source, cross-platform JavaScript runtime environment that lets developers create servers, web apps, command line tools and scripts. <br>
- Paymenter API - https://npmjs.org/package/paymenter-api <br>
A Node.js API wrapper for interacting with the Paymenter API. This package provides an easy-to-use interface for managing tickets, invoices, and other related features for both clients and admins.
- Discord.js - https://discord.js.org <br>
discord.js is a powerful Node.js module that allows you to interact with the Discord API very easily. It takes a much more object-oriented approach than most other JS Discord libraries, making your bot's code significantly tidier and easier to comprehend.
- Mongoose - https://mongoosejs.com/ <br>
Elegant MongoDB object modeling for Node.js

# License
This project is licensed under the Apache License 2.0 <br>
By downloading the code you agree to all terms within the license.

# About CPTCR Hosting
**Reliable, Scalable, and Secure Hosting Solutions** <br>
CPTCR Hosting combines industry-leading technology with expert support to deliver exceptional hosting solutions for gaming, websites, and custom applications. Let us power your next project with reliability and scalability. <br>
- Discord: https://cptcr.cc/discord
- Website: https://cptcr.cc
- Shop: https://cptcr.shop
- Developer: https://cptcr.xyz