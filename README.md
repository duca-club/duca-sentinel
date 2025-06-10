# DUCA Sentinel

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg?style=for-the-badge)
![NodeJS](https://img.shields.io/badge/NodeJS-v22%2B-%235FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white&logoSize=auto)
![Prettier](https://img.shields.io/badge/Prettier-%23F7B93E?style=for-the-badge&logo=prettier&logoColor=black&logoSize=auto)

Official Discord bot for the **Deakin University Cybersecurity Association (DUCA)** Discord community server.  
DUCA Sentinel provides member verification, utility commands, and entertainment features to enhance the server experience.

## 📂 Project Structure

```
duca-sentinel/
├── .husky/              # Git pre-commit hooks
│
├── dist/                # Compiled JavaScript output
│
├── emojis/              # Custom emoji assets
│
├── src/
│   ├── commands/        # Discord slash commands
│   ├── config/
│   ├── events/          # Discord event handlers
│   ├── lib/             # External libraries
│   ├── utils/           # Utility/helper functions
│   └── index.ts
│
├── .env                 # Environment variables
├── .env.exampple        # Example environment variables
├── .gitattributes       # Git config
├── .gitignore           # Git ignore
├── .gitlab-ci.yml
├── .prettierrc          # Prettier config
├── CONTRIBUTING.md
├── package-lock.json
├── package.json         # Project metadata & dependencies
├── README.md
└── tsconfig.json        # TypeScript configuration
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v22 or higher)

### Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/duca-club/duca-sentinel.git
    cd duca-sentinel
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Set up environment variables**

    Create a `.env` file in the root directory using the provided `.env.example` template:

    ```bash
    cp .env.example .env
    ```

    Configure environment variables:
    | Variable | Description | Required |
    |----------|-------------|----------|
    | `DISCORD_TOKEN` | Your Discord bot token | ✅ |
    | `GUILD_ID` | Discord server ID | ✅ |
    | `DEV_ROLE_ID` | Developer role ID for dev commands | ✅ |
    | `MEMBER_ROLE_ID` | Member role ID (for verification) | ✅ |
    | `SUPABASE_URL` | Supabase project URL | ✅ |
    | `SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |

4. **Build the project**

    ```bash
    npm run build
    ```

5. **Start the bot**
    ```bash
    npm start
    ```

## 🤝 Contributing

Please refer to the [contribution guideline](CONTRIBUTING.md) for more details.

## ❤️ Acknowledgements

Developing this project is possible thanks to the following tools:

- [discord.js](https://discord.js.org) - Powerful Node.js module that allows interaction with the Discord API.
- [CommandKit](https://commandkit.js.org) - A discord.js handler for commands and events.
- [Supabase](https://supabase.com) - Open-source Firebase alternative.

---

<p align="center">
  <strong>Made with ❤️ by <a href="https://www.linkedin.com/in/pasinduperamuna">dec1bel</a></strong>
</p>
