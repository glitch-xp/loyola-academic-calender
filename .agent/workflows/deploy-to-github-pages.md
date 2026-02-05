---
description: How to deploy the web version of the app to GitHub Pages with PWA Support
---

# Deploying to GitHub Pages

This workflow allows you to build the web version of your Expo app and deploy it to GitHub Pages.

## Prerequisites

- The project is already configured with `gh-pages` package.
- `app.json` and `package.json` have been updated with the correct `baseUrl` and `homepage` for your repository.
- You have push access to the repository.

## Deployment Steps

1. **Deploy Command**
   Run the following command in your terminal. This will:
   - Build the web bundle (exported to `dist/`)
   - Push the contents of `dist/` to the `gh-pages` branch of your repository.

   ```bash
   // turbo
   npm run deploy
   ```

2. **Verify Deployment**
   - Go to your GitHub repository Settings > Pages.
   - Ensure the "Source" is set to "Deploy from a branch".
   - Ensure the "Branch" is `gh-pages` and folder is `/ (root)`.
   - Your site will be live at: [https://glitch-xp.github.io/loyola-academic-calender/](https://glitch-xp.github.io/loyola-academic-calender/)

## "Add to Home Screen" Feature

- A PWA "Install App" prompt has been added for web users.
- **Android/Chrome**: A banner will appear automatically allowing one-click installation.
- **iOS/Safari**: Instructions will appear (Share -> Add to Home Screen) as iOS does not support automatic prompts.
- This feature is active only when the app is running in a browser and not already installed.
