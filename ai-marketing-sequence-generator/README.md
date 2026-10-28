# AI Marketing Sequence Generator 📣

A beginner-friendly **college project** built with **Python, Streamlit, and OpenAI**. Enter a product, target audience, campaign goal, platform, and tone to create a sequence of marketing messages with suggested send days and calls to action.

## Features
- Input product/service name and target audience
- Choose campaign goal, platform, tone, and 2–5 messages
- **Demo mode**: free template-based sample sequences, no API key needed
- **AI mode**: real AI-generated campaign drafts using an OpenAI API key
- View messages and download as **CSV** or **JSON**
- Does not automatically send messages

## Requirements
- Python 3.10 or newer
- Internet access for AI mode
- An OpenAI API key for AI mode (API usage may cost money)

## Run locally

1. Download or clone the repository and open its folder in VS Code.
2. Open a terminal in the project folder.
3. (Recommended) Create a virtual environment:

   ```bash
   python -m venv .venv
   ```

   Activate it on Windows:

   ```powershell
   .venv\Scripts\activate
   ```

   Or on macOS/Linux:

   ```bash
   source .venv/bin/activate
   ```

4. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

5. Start the app:

   ```bash
   streamlit run app.py
   ```

6. Open the local URL shown in the terminal (usually `http://localhost:8501`). Select **Demo** mode to test without a key.

## Enable AI mode (optional)

1. Create an OpenAI API key in your OpenAI API account. ChatGPT subscriptions and API billing are separate.
2. Copy `.env.example` to `.env`.
3. Replace `your_api_key_here` with your real key in `.env`.
4. Restart the Streamlit app and select **AI** mode.

**Security:** Never paste an API key into `app.py`, `README.md`, GitHub, screenshots, or chat. `.env` and `.streamlit/secrets.toml` are ignored by Git.

## Publish on GitHub

1. Create a new GitHub repository named `ai-marketing-sequence-generator`.
2. Upload `app.py`, `generator.py`, `requirements.txt`, `.env.example`, `.gitignore`, and `README.md`.
3. Commit the files. **Do not upload `.env` or your API key.**

GitHub stores the source code; it does **not** run this Streamlit app by itself.

## Deploy on Streamlit Community Cloud

1. Sign in at https://share.streamlit.io/ with GitHub.
2. Select **Create app** → **Deploy a public app from GitHub**.
3. Choose the repository, branch `main`, and entrypoint `app.py`.
4. Deploy. Demo mode should work without secrets.
5. For AI mode, in your app's settings, add the following **secret** (with your actual key) and reboot the app:

   ```toml
   OPENAI_API_KEY = "your_actual_key"
   OPENAI_MODEL = "gpt-4o-mini"
   ```

The default model may need changing if it is unavailable to your API account. Check current API model availability and pricing.

## Project explanation (for viva)

**Problem statement:** Creating multi-step marketing messages manually is time-consuming and often inconsistent.

**Objective:** Build a web app that generates a structured, platform-specific marketing sequence from user inputs.

**Architecture:** User → Streamlit form → `generator.py` → demo templates or OpenAI API → validated messages → Streamlit results → CSV/JSON download.

**Modules:**
- User interface: `app.py` (Streamlit)
- Sequence generation: `generator.py`
- Optional API configuration: `.env` / Streamlit secrets
- Export: Python `csv` and `json` modules

**Limitations:** The demo mode is template-based, not AI. AI mode needs a paid/available API account. The app does not send messages, measure campaign performance, store customer data, or guarantee factual correctness. The AI output should be reviewed before publication.

**Future enhancements:** Editable messages, calendar scheduling, multilingual campaigns, A/B variations, analytics, authentication, and integrations with opt-in email services.

## Example input
- Product: GlowUp Skincare
- Audience: College students aged 18–25
- Goal: Product launch
- Platform: Email
- Tone: Friendly
- Messages: 3

## Responsible use
Only contact people who have consented to receive marketing. Do not invent claims, testimonials, discounts, or deadlines. Respect opt-out requests and applicable privacy and anti-spam rules.
