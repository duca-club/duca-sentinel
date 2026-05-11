# DUCA Sentinel

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg?style=for-the-badge)
![NodeJS](https://img.shields.io/badge/NodeJS-v24%2B-%235FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white&logoSize=auto)

Official Discord bot for the **Deakin University Cybersecurity Association (DUCA)** Discord community server.  
DUCA Sentinel provides member verification, utility commands, and entertainment features to enhance the server experience.

## 📂 Project Structure

```
duca-sentinel/
├── dist/                # Compiled JavaScript output
│
├── emojis/              # Custom emoji assets
│
├── src/
│   ├── app/
│   │   ├── commands/    # Slash commands (tsx uses CommandKit components)
│   │   ├── events/      # Discord event handlers
│   │   └── tasks/       # @commandkit/tasks schedules
│   ├── flags/           # Feature flag definitions
│   ├── lib/             # Supabase client, env config, news helpers
│   └── providers/       # Flag provider implementations
│
├── commandkit.config.ts
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** v24+
- **pnpm**
- A **Discord application + bot token**
- A **Supabase project** (database + service role key)

### Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/duca-club/duca-sentinel.git
    cd duca-sentinel
    ```

2. **Install dependencies**

    ```bash
    pnpm install
    ```

3. **Set up environment variables**

    Create a `.env` file in the root directory using the provided `.env.example` template:

    ```bash
    cp .env.example .env
    ```

    Configure environment variables:
    | Variable | Required | Description |
	|---|---:|---|
	| `DISCORD_TOKEN` | ✅ | Discord bot token |
	| `MEMBER_ROLE_ID` | ✅ | Role ID assigned on successful verification |
	| `NEWS_CHANNEL_ID` | ✅ | Channel ID where news posts will be sent |
	| `SUPABASE_URL` | ✅ | Supabase project URL |
	| `SUPABASE_SECRET_KEY` | ✅ | Supabase **service role** key (server-side) |
	| `NEWS_TIMEZONE` | ⛔ | Digest timezone (default `Australia/Sydney`) |
	| `NEWS_DIGEST_CRON` | ⛔ | Digest schedule (default `0 9,17 * * *`) |
	| `NEWS_ALERT_CRON` | ⛔ | Alerts schedule (default `0 * * * *`) |
	| `NEWS_ALERT_KEYWORDS` | ⛔ | Comma-separated keywords (default `critical,zero-day,zero day`) |

	Notes:
	- `NEWS_FEED_URL` is currently set in code to `https://feeds.feedburner.com/TheHackersNews`.
	- The alerts task runs in a fixed timezone (`Asia/Kolkata`) to align with the RSS feed timestamp behavior.

4. **Build the project**

    ```bash
    pnpm run build
    ```

5. **Start the bot**
    ```bash
    pnpm start
    ```

## 🤝 Contributing

Please refer to the [contribution guideline](CONTRIBUTING.md) for more details.

## ❤️ Acknowledgements

Developing this project is possible thanks to the following tools:

- [discord.js](https://discord.js.org) - Powerful Node.js module that allows interaction with the Discord API.
- [CommandKit](https://commandkit.dev) - A discord.js handler for commands and events.
- [Supabase](https://supabase.com) - Open-source Firebase alternative.

---

<p align="center">
  <strong>Made with ❤️ by <a href="https://www.linkedin.com/in/pasinduperamuna">dec1bel</a></strong>
</p>
