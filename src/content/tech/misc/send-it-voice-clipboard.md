---
title: "Send It: A Dead Simple Voice-to-Clipboard Bridge for AI Workflows"
date: 2026-01-31
description: "A minimal React Native + Flask app that sends voice-to-text from your phone directly to your desktop clipboard"
category: misc
tags: [react-native, flask, python, productivity, ai]
draft: false
---

I built a tiny app to solve an annoying problem: getting spoken text from my phone to my desktop clipboard quickly.

## The Problem

I use AI tools constantly—Claude, ChatGPT, local LLMs. Sometimes I want to dictate a prompt or context while away from my keyboard. My phone has great voice-to-text, but getting that text to my desktop clipboard was always friction. Copy, open a notes app, paste, sync, open on desktop, copy again... too many steps.

## The Solution

**Send It** is about 200 lines of code total:

1. A React Native app (built with Expo) where I can type or dictate text
2. A Python Flask server running on my desktop that receives the text and copies it straight to my clipboard

That's it. Open app, talk, tap "Send & Copy", text is on my desktop clipboard ready to paste into whatever AI tool I'm using.

## How It Works

The mobile app is straightforward React Native—a text input, a configurable server URL, and two buttons: "Send" and "Send & Copy". The server URL is editable so I can point it at whatever machine I'm working on.

```javascript
const sendText = async (shouldCopy = false) => {
  const response = await fetch(`${serverUrl}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, shouldCopy }),
  });
  // ...
};
```

The Python server is even simpler—Flask receiving POST requests and using `pyperclip` to hit the system clipboard:

```python
@app.route("/", methods=["POST"])
def receive_text():
    data = request.get_json(force=True)
    text_to_copy = data.get("text", "")
    should_copy = data.get("shouldCopy", False)

    if should_copy and text_to_copy:
        pyperclip.copy(text_to_copy)

    return jsonify({"status": "ok"}), 200
```

On Linux you need `xclip` or `xsel` installed for clipboard access. macOS and Windows work out of the box.

## Why Not Just Use...

**Existing clipboard sync apps?** Most are overkill, require accounts, or don't work well across my mix of Android and Linux. This is zero config once the server IP is set.

**KDE Connect / similar?** Great tools, but I wanted something minimal that works regardless of desktop environment.

**Email/notes sync?** Too many steps. I want one tap.

## Running It Yourself

Mobile app:
```bash
npm install
npx expo start
```

Server (Python 3.13+):
```bash
cd python_server
pip install flask pyperclip
python server.py
```

Server runs on port 8085 by default. Point the app at your desktop's IP and you're set.

## What I Actually Use This For

- Dictating long prompts for Claude or ChatGPT while pacing around
- Capturing quick thoughts or code snippets when I'm away from my desk
- Building up context for AI conversations piece by piece
- Grabbing text from my phone without the copy-paste dance

It's not fancy, but it removes friction from my AI workflow. Sometimes the best tool is the one that does exactly one thing and gets out of your way.

---

*The code is minimal enough to audit in five minutes and modify however you want. No telemetry, no accounts, no cloud—just your phone talking to your computer over your local network.*
