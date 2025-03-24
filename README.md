# DUCA Sentinel
DUCA Sentinel is the official Discord bot designed and developed for the Deakin University Cybersecurity Association (DUCA) community server. Currently still in early development, the bot helps manage member verification and provides various utility and fun commands to enhance the server experience.

## ✨ Features
### ✅ Member Verification
- Verifies users against the DUCA membership database
- Automatically assigns the _@Member_ role to verified members
- Stores verification data securely in Supabase

### 🛠️ Utility Commands
- `/ping`: Check bot latency and connection status
- `/help`: Display all available commands and their descriptions
- `/verify`: Verify your DUCA membership status

### 🎮 Fun Commands
- `/8ball`: Ask the magic 8-ball a question and receive a mystical answer
- `/cat`: Get a random HTTP status code with a cat image
- `/flip`: Flip a coin and see if it lands on heads or tails

## 🏗️ Project Structure
```
duca-sentinel/
├── src/
│   ├── commands/
│   │   ├── 8ball.js
│   │   ├── cat.js
│   │   ├── flip.js
│   │   ├── help.js
│   │   ├── ping.js
│   │   └── verify.js
│   ├── events/
│   │   ├── ready.js
│   │   └── setActivity.js
│   └── index.js
├── .env
├── package.json
└── README.md
```

## 🤝 Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
   * **Please follow this specification for commit messages:** https://www.conventionalcommits.org/en/v1.0.0/#summary
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License
This project is maintained by the Deakin University Cybersecurity Association (DUCA).

## 👥 Contact
For questions or support, please open an issue on GitHub.

---
Made w/ <3 by [dec1bel](https://www.linkedin.com/in/pasinduperamuna/) for DUCA
