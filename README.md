# Featherweight

Featherweight is an AI-driven journaling platform built around **Flappy**, a compassionate, memory-enabled AI character. Designed for private, uncensored self-expression, Featherweight lets users capture their thoughts and emotions across multiple channels—web, SMS, email, and social media—without friction or judgment. By integrating the Venice API, Twilio, and SendGrid, every interaction becomes a meaningful journal entry, helping users reflect, process, and grow.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Architecture & Flow](#architecture--flow)
4. [Tech Stack](#tech-stack)
5. [Getting Started](#getting-started)

   * [Prerequisites](#prerequisites)
   * [Installation](#installation)
   * [Configuration](#configuration)
   * [Running Locally](#running-locally)
6. [Usage & Workflow](#usage--workflow)
7. [Security & Privacy](#security--privacy)
8. [Roadmap](#roadmap)
9. [Contributing](#contributing)
10. [License](#license)

---

## Project Overview

Featherweight exists to make journaling feel as natural as texting a friend. Powered by the Venice API’s uncensored language models and image generator, Flappy engages users in conversational check-ins, emotional reflections, and prompts for deeper insight. Whether typing on the web, sending an SMS, or replying via email, every message is recorded, organized, and stored securely. The end result is a private, cross-platform emotional companion that supports self-awareness and personal growth.

---

## Key Features

* **Conversational Journaling**
  Flappy transforms every user message into a structured journal entry. Whether you’re venting or reflecting, Flappy responds with empathy, prompts, and occasional visuals.

* **Multi-Channel Access**

  * **Web App:** A React-based interface for typing, reviewing past entries, and seeing emotion-tracking summaries.
  * **SMS Integration:** Users can text Flappy via Twilio to journal on the go.
  * **Email Integration:** Send or reply to a Flappy email; entries are captured automatically.
  * **Social Agents:** Autonomous Flappy accounts on X (Twitter), Instagram, and TikTok post mood-driven content, bringing journaling into the wider community.

* **Persistent Memory & Personalization**
  Flappy retains context across platforms. If you start a conversation on SMS and continue on the web, Flappy remembers your previous entries, tone, and preferences.

* **Venice-Powered AI**

  * **LLM Inference & Character API:** Flappy’s core personality is instantiated through Venice’s character endpoint, enabling uncensored, emotionally intelligent dialogue.
  * **Image API:** Automatically generated mood-aligned visuals for social posts or in-app summaries.
  * **Search & Data Analysis:** Periodic emotion summaries and pattern analysis to highlight trends over time.

* **Privacy-First Design**

  * All data is encrypted in transit (TLS 1.3) and at rest (AES-256).
  * Users can opt in or out of memory retention.
  * No third-party trackers; no data is sold or shared.

---

## Architecture & Flow

1. **User Interaction Layer**

   * Web App (React + Node.js)
   * iOS/Android App (mobile prototype)
   * SMS (Twilio)
   * Email (SendGrid)
   * Social Media Agents (X, Instagram, TikTok via ElizaOS and n8n)

2. **Flappy Core**

   * Receives incoming user messages from any channel.
   * Routes each message through Venice’s Character API for context, tone, and response generation.
   * Saves journal entries (raw text and AI-generated summaries) to the database.

3. **Venice API Integration**

   * **LLM Inference Endpoint:** Processes raw text, generates empathetic responses.
   * **Character Endpoint:** Maintains Flappy’s memory, persona, and user context.
   * **Image Generator Endpoint:** Produces mood-aligned visuals for social posts and in-app summaries.
   * **Search & Data Analysis Endpoint:** Provides periodic emotion analytics and summary reports.

4. **Data Layer**

   * MongoDB / Supabase (optional) for persistent storage of journal entries, user profiles, and Flappy’s memory snapshots.
   * File storage for images and attachments as needed.

5. **Automation & Workflows**

   * n8n orchestrates message routing, API calls, and social media interactions.
   * Cron jobs trigger weekly/monthly summarizations of user data for in-app dashboards.

---

## Tech Stack

* **Backend:** Node.js, Express
* **Frontend:** React (Next.js or Create React App)
* **Database:** MongoDB (or Supabase for real-time support)
* **Venice API:**

  * Character API (Flappy persona + memory)
  * LLM Inference (dialogue generation)
  * Image Generator (visual assets)
  * Search & Data Analysis (emotion summaries)
* **SMS Integration:** Twilio
* **Email Integration:** SendGrid SMTP
* **Automation:** n8n for workflow orchestration
* **Hosting:** Vercel (front-end), Heroku or DigitalOcean (backend)
* **Authentication (future):** Supabase Auth or custom JWT service
* **CI/CD (optional):** GitHub Actions

---

## Getting Started

### Prerequisites

1. **Node.js** (v14 or later) and **npm** (or Yarn)
2. **Git** (for cloning and version control)
3. **Venice API Key** (create an account at [Venice.ai](https://venice.ai))
4. **Twilio Account SID & Auth Token** (for SMS)
5. **SendGrid API Key** (for email)
6. **MongoDB Connection URI** (or Supabase credentials)

### Installation

1. **Clone the Repository**

   ```
   git clone https://github.com/kunleulysses/featherweight.git
   cd featherweight
   ```

2. **Install Dependencies**

   ```
   npm install
   ```

   or

   ```
   yarn install
   ```

3. **Create a Configuration File**
   Copy `.env.example` to `.env` and fill in the required environment variables:

   ```
   VENICE_API_KEY=your_venice_api_key
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   SENDGRID_API_KEY=your_sendgrid_key
   MONGODB_URI=your_mongo_connection_string
   PORT=3000
   ```

### Running Locally

* **Backend Server**

  ```
  npm run dev
  ```

  This starts the Express server on `http://localhost:3000`.

* **Frontend (if separate)**

  ```
  cd src
  npm run dev
  ```

  This starts the React development server on `http://localhost:3001` (or the port specified).

### Deployment

* **Vercel / Netlify (Frontend)**

  * Connect GitHub repo, select `main` branch, set environment variables, deploy.

* **Heroku / DigitalOcean (Backend)**

  * Push to main, set environment variables in the dashboard, deploy.

* **GitHub Actions (CI/CD)**

  1. Create `.github/workflows/deploy.yml` with deployment steps for Vercel/Heroku.
  2. Ensure secrets (API keys) are stored in GitHub repository settings.

---

## Usage & Workflow

1. **Sign Up / Sign In**

   * Create a new account or log in. (Currently via email/username; SSC integration coming later.)

2. **Web App Interaction**

   * Navigate to the chat interface.
   * Type or speak your journal entry—Flappy responds in real time, saves each entry with timestamps.
   * Access the “Summary” tab to see periodic emotion analytics (weekly or monthly).

3. **SMS & Email Journaling**

   * Text Flappy at your assigned Twilio number. Every message is turned into a journal entry.
   * Reply to Flappy’s emails (from SendGrid) with reflections; they are logged under your profile.

4. **Social Media Agents**

   * Flappy’s X account posts daily prompts or quotes drawn from your own aggregated data (anonymized).
   * Instagram and TikTok channels share mood-aligned visuals automatically generated by Venice.

5. **Data & Privacy Controls**

   * In Settings, users can download or delete their entire journal history.
   * Memory toggle (On/Off) controls whether Flappy retains new entries or processes them ephemerally.

---

## Security & Privacy

* **Encryption**

  * TLS 1.3 for all client-server communication.
  * AES-256 encryption for data at rest.

* **Data Minimization**

  * Only store what’s necessary for journaling and summaries.
  * Raw entries are periodically summarized by an LLM to reduce storage overhead.

* **Controlled Memory**

  * Users can opt in or out of memory retention at any time.
  * Ephemeral mode: conversations are processed but not stored beyond the session.

* **No Third-Party Trackers**

  * No analytics pixels, ad trackers, or external monitoring.
  * Only Twilio and SendGrid servers see your messages in transit.

* **Secure Deployment**

  * Environment variables are managed via the hosting platform.
  * Regular security audits of n8n workflows and server logs.

---

## Roadmap

* **June 2025**

  * Complete Instagram & TikTok automation flows.
  * Finalize security and privacy guardrails (encrypt-at-source memory, optional local storage integration).
  * Submit iOS/Android prototype to App Store and Play Store.

* **July 2025**

  * Public beta launch with web, SMS, email, and mobile clients fully operational.
  * Expand Flappy’s personalization (voice journaling, mood tags, natural language summaries).
  * Begin integration with decentralized identity (DID) and user-owned storage.

* **August–September 2025**

  * Monetization features: subscription tiers, premium journaling prompts, and guided programs.
  * Community features: user groups, shared prompts, anonymized emotion data charts.
  * API documentation for third-party developers to build additional Flappy “mini-characters.”

---

## Contributing

Featherweight is built to be collaborative, transparent, and community-driven. If you’d like to:

1. **Submit a Bug Report**

   * Open an [Issue](https://github.com/kunleulysses/featherweight/issues/new). Include details, reproduction steps, and screenshots if relevant.

2. **Request a Feature**

   * Create an [Issue](https://github.com/kunleulysses/featherweight/issues/new) with a clear description of the requested feature and its benefit.

3. **Submit Code**

   * Fork the repo, create a feature branch (`git checkout -b feature/YourFeatureName`), commit your changes, and open a Pull Request against `main`.
   * Ensure your changes include tests, follow code style, and update documentation as needed.

4. **Join the Discussion**

   * Participate in Issues and pull requests. Provide feedback, suggest improvements, and help refine vision.

---

## License

This project is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute, as long as you maintain attribution and include the same license in your derivative projects.

---

## Author

**Ulysses Adejokun**
Founder & Creator, Featherweight
Email: [kunleulysses@gmail.com](mailto:kunleulysses@gmail.com)
Website: [featherweight.world](https://featherweight.world)

---

> “Featherweight isn’t just an app— it’s a new way of being heard. By blending AI intelligence with true privacy, we empower people to express themselves on their own terms.”
> — Ulysses Adejokun, 2025
