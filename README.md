<div align="center">

<img src="docs/public/images/bytebot-logo.png" width="500" alt="Bytebot Logo">

# Bytebot: Open-Source AI Desktop Agent

<a href="https://trendshift.io/repositories/14624" target="_blank"><img src="https://trendshift.io/api/badge/repositories/14624" alt="bytebot-ai%2Fbytebot | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>

**An AI that has its own computer to complete tasks for you**

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/bytebot-jun-26-codex-login-gate-extensio?referralCode=SEF788)

[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://github.com/bytebot-ai/bytebot/tree/main/docker)
[![License](https://img.shields.io/badge/license-Apache%202.0-green.svg)](LICENSE)

[🌐 Website](https://bytebot.ai) • [📚 Documentation](https://docs.bytebot.ai/introduction) (self-hosted with the stack) • [𝕏 Twitter](https://x.com/bytebot_ai)

<!-- Keep these links. Translations will automatically update with the README. -->
[Deutsch](https://zdoc.app/de/bytebot-ai/bytebot) | 
[Español](https://zdoc.app/es/bytebot-ai/bytebot) | 
[français](https://zdoc.app/fr/bytebot-ai/bytebot) | 
[日本語](https://zdoc.app/ja/bytebot-ai/bytebot) | 
[한국어](https://zdoc.app/ko/bytebot-ai/bytebot) | 
[Português](https://zdoc.app/pt/bytebot-ai/bytebot) | 
[Русский](https://zdoc.app/ru/bytebot-ai/bytebot) | 
[中文](https://zdoc.app/zh/bytebot-ai/bytebot)
</div>

---

https://github.com/user-attachments/assets/f271282a-27a3-43f3-9b99-b34007fdd169

https://github.com/user-attachments/assets/72a43cf2-bd87-44c5-a582-e7cbe176f37f

## What is a Desktop Agent?

A desktop agent is an AI that has its own computer. Unlike browser-only agents or traditional RPA tools, Bytebot comes with a full virtual desktop where it can:

- Use any application (browsers, email clients, office tools, IDEs)
- Download and organize files with its own file system
- Log into websites and applications using password managers
- Read and process documents, PDFs, and spreadsheets
- Complete complex multi-step workflows across different programs

Think of it as a virtual employee with their own computer who can see the screen, move the mouse, type on the keyboard, and complete tasks just like a human would.

## Why Give AI Its Own Computer?

When AI has access to a complete desktop environment, it unlocks capabilities that aren't possible with browser-only agents or API integrations:

### Complete Task Autonomy

Give Bytebot a task like "Download all invoices from our vendor portals and organize them into a folder" and it will:

- Open the browser
- Navigate to each portal
- Handle authentication (including 2FA via password managers)
- Download the files to its local file system
- Organize them into a folder

### Process Documents

Upload files directly to Bytebot's desktop and it can:

- Read entire PDFs into its context
- Extract data from complex documents
- Cross-reference information across multiple files
- Create new documents based on analysis
- Handle formats that APIs can't access

### Use Real Applications

Bytebot isn't limited to web interfaces. It can:

- Use desktop applications like text editors, VS Code, or email clients
- Run scripts and command-line tools
- Install new software as needed
- Configure applications for specific workflows

## Quick Start

### Deploy in 2 Minutes

**Option 1: Railway (Easiest)**

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/bytebot-jun-26-codex-login-gate-extensio?referralCode=SEF788)

Just click to deploy, then add your AI provider API key from the Bytebot UI at `/models`.

**Option 2: Docker Compose**

```bash
git clone https://github.com/JHJHJHJH/bytebot-han.git
cd bytebot-han

docker-compose -f docker/docker-compose.yml up -d

# Open http://localhost:9992/models to add an AI provider key
```

Docker Compose protects the web UI by default with username `admin` and
password `password`. To override them, add both values to `docker/.env` before
starting the stack:

```bash
BYTEBOT_UI_ADMIN_USER=admin
BYTEBOT_UI_ADMIN_PASSWORD=change-me
```

## How It Works

Bytebot consists of four integrated components:

1. **Virtual Desktop**: A complete Ubuntu Linux environment with pre-installed applications
2. **AI Agent**: Understands your tasks and controls the desktop to complete them
3. **Task Interface**: Web UI where you create tasks and watch Bytebot work
4. **APIs**: REST endpoints for programmatic task creation and desktop control

### Key Features

- **Natural Language Tasks**: Just describe what you need done
- **File Uploads**: Drop files onto tasks for Bytebot to process
- **Live Desktop View**: Watch Bytebot work in real-time
- **Takeover Mode**: Take control when you need to help or configure something
- **Password Manager Support**: Install 1Password, Bitwarden, etc. for automatic authentication
- **Persistent Environment**: Install programs and they stay available for future tasks

## Example Tasks

### Basic Examples

```
"Go to Wikipedia and create a summary of quantum computing"
"Research flights from NYC to London and create a comparison document"
"Take screenshots of the top 5 news websites"
```

### Document Processing

```
"Read the uploaded contracts.pdf and extract all payment terms and deadlines"
"Process these 5 invoice PDFs and create a summary report"
"Download and analyze the latest financial report and answer: What were the key risks mentioned?"
```

### Multi-Application Workflows

```
"Download last month's bank statements from our three banks and consolidate them"
"Check all our vendor portals for new invoices and create a summary report"
"Log into our CRM, export the customer list, and update records in the ERP system"
```

## Programmatic Control

### Create Tasks via API

```python
import requests

# Simple task
response = requests.post('http://localhost:9991/tasks', json={
    'description': 'Download the latest sales report and create a summary'
})

# Task with file upload
files = {'files': open('contracts.pdf', 'rb')}
response = requests.post('http://localhost:9991/tasks',
    data={'description': 'Review these contracts for important dates'},
    files=files
)
```

### Direct Desktop Control

```bash
# Take a screenshot
curl -X POST http://localhost:9990/computer-use \
  -H "Content-Type: application/json" \
  -d '{"action": "screenshot"}'

# Click at specific coordinates
curl -X POST http://localhost:9990/computer-use \
  -H "Content-Type: application/json" \
  -d '{"action": "click_mouse", "coordinate": [500, 300]}'
```

[Full API documentation →](http://localhost:9993/api-reference/introduction)

## Setting Up Your Desktop Agent

### 1. Deploy Bytebot

Use one of the deployment methods above to get Bytebot running.

### 2. Connect an AI Provider

Open the Models page at `/models` in the web UI, add an Anthropic, OpenAI, or Gemini API key, and test the connection.

### 3. Configure the Desktop

Use the Desktop tab in the UI to:

- Install additional programs you need
- Set up password managers for authentication
- Configure applications with your preferences
- Log into websites you want Bytebot to access

### 4. Start Giving Tasks

Create tasks in natural language and watch Bytebot complete them using the configured desktop.

## Use Cases

### Business Process Automation

- Invoice processing and data extraction
- Multi-system data synchronization
- Report generation from multiple sources
- Compliance checking across platforms

### Development & Testing

- Automated UI testing
- Cross-browser compatibility checks
- Documentation generation with screenshots
- Code deployment verification

### Research & Analysis

- Competitive analysis across websites
- Data gathering from multiple sources
- Document analysis and summarization
- Market research compilation

## Architecture

Bytebot is built with:

- **Desktop**: Ubuntu 22.04 with XFCE, Firefox, VS Code, and other tools
- **Agent**: NestJS service that coordinates AI and desktop actions
- **UI**: Next.js application for task management
- **AI Support**: Works with Anthropic Claude, OpenAI GPT, Google Gemini
- **Deployment**: Docker containers for easy self-hosting

## Why Self-Host?

- **Data Privacy**: Everything runs on your infrastructure
- **Full Control**: Customize the desktop environment as needed
- **No Limits**: Register your own AI API keys in `/models` without platform restrictions
- **Flexibility**: Install any software, access any systems

## License

Bytebot is open source under the Apache 2.0 license.

---

<div align="center">

**Give your AI its own computer. See what it can do.**

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/bytebot-jun-26-codex-login-gate-extensio?referralCode=SEF788)

<sub>Built by [Tantl Labs](https://tantl.com) and the open source community</sub>

</div>
