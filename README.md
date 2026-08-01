# DUCA Sentinel

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.12%2B-3776AB?style=for-the-badge&logo=python&logoColor=white&logoSize=auto)

Official Discord bot for the **Deakin University Cybersecurity Association (DUCA)** Discord community server.  
DUCA Sentinel provides member verification, utility commands, and entertainment features to enhance the server experience.

## 📂 Project Structure

```
duca-sentinel/
├── emojis/                  # Custom emoji assets
│
├── src/duca_sentinel/
│   ├── app/
│   │   ├── commands/        # Slash commands, loaded as discord.py extensions
│   │   ├── events/          # Discord event handlers
│   │   └── tasks/           # Cron-scheduled background tasks
│   ├── flags/               # Feature flag definitions
│   ├── lib/                 # Supabase client, env config, news helpers
│   ├── providers/           # Flag provider implementations
│   ├── bot.py               # Client construction and startup wiring
│   └── __main__.py          # Entry point
│
├── pyproject.toml
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Python** 3.12+
- A **Discord application + bot token**
- A **Supabase project** (database + service role key)

### Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/duca-club/duca-sentinel.git
    cd duca-sentinel
    ```

2. **Create a virtual environment and install dependencies**

    ```bash
    python -m venv .venv
    source .venv/bin/activate
    pip install -e .
    ```

    Add the `dev` extra (`pip install -e ".[dev]"`) to also install [Ruff](https://docs.astral.sh/ruff/) for linting and formatting.

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

4. **Start the bot**

    ```bash
    python -m duca_sentinel
    ```

    Slash commands are synced globally on startup, which can take up to an hour to propagate to Discord.

### Linting & formatting

```bash
ruff check src
ruff format src
```

## 🤝 Contributing

Please refer to the [contribution guideline](CONTRIBUTING.md) for more details.

## ❤️ Acknowledgements

Developing this project is possible thanks to the following tools:

- [discord.py](https://discordpy.readthedocs.io) - Modern, feature-rich API wrapper for Discord written in Python.
- [APScheduler](https://apscheduler.readthedocs.io) - In-process task scheduler with cron-like scheduling.
- [Supabase](https://supabase.com) - Open-source Firebase alternative.

---

<p align="center">
  <strong>Made with ❤️ by <a href="https://www.linkedin.com/in/pasinduperamuna">dec1bel</a></strong>
</p>
