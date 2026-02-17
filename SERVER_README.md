# Stremio Profile Switcher - Server Setup

## Overview

This is a forked version of Stremio Web with built-in profile switching functionality. The server provides a Netflix-style profile selector and manages authentication through the Stremio API.

## Features

- 🎭 **Profile Switching**: Netflix-style profile selector with avatar support
- 🔐 **PIN Protection**: Optional PIN codes for individual profiles
- 🔒 **Encrypted Storage**: Profile passwords encrypted with AES-256
- 🌐 **Stremio API Integration**: Seamless login proxy to official Stremio API
- 📱 **Responsive UI**: Works on desktop, mobile, and TV
- ➕ **Web UI for Profile Management**: Add, edit and delete profiles directly in the browser
- 🔄 **Auto authKey Renewal**: Silently refreshes expired sessions on startup

## Prerequisites

- Node.js 12 or higher
- pnpm 10 or higher

## Installation

1. Install dependencies:
```bash
pnpm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Edit `.env` and set your encryption key (must be exactly 32 characters):
```env
PORT=8080
ENCRYPTION_KEY=your-32-character-encryption-key
STREMIO_API_URL=https://api.strem.io/api
```

## Configuration

### Adding Profiles

The easiest way is to use the built-in web UI: open the profile selector in your browser and click **"+ Add Profile"**. Enter the profile name, Stremio email/password, choose an avatar, and optionally set a PIN.

Alternatively, you can edit `server/data/profiles.json` directly. Leave `encryptedPassword` empty and use the encryption utility below to fill it in.

### Encrypting Passwords

To manually encrypt a password:

```bash
node -e "
const { encrypt } = require('./server/utils/encryption');
const password = 'your-password-here';
const key = 'your-32-character-encryption-key';
console.log(encrypt(password, key));
"
```

Copy the output to the `encryptedPassword` field in `profiles.json`.

## Running the Server

### Development Mode

Build the frontend and start the server:

```bash
pnpm run server:dev
```

This will:
1. Build the Stremio Web frontend
2. Start the Express server on port 8080 (or your configured PORT)

### Production Mode

For production, first build the frontend:

```bash
pnpm run build
```

Then start the server:

```bash
pnpm run server:prod
```

## Usage

1. Open your browser to `http://localhost:8080`
2. You'll see the profile selector screen
3. Click on a profile to log in
4. If the profile has a PIN, enter it
5. You'll be redirected to Stremio Web with your profile loaded

## API Endpoints

### Profiles

- `GET /api/profiles` - List all profiles (without passwords)
- `POST /api/profiles` - Create a new profile
- `PUT /api/profiles/:id` - Update a profile
- `DELETE /api/profiles/:id` - Delete a profile

### Authentication

- `POST /api/auth/switch` - Switch to a profile (returns authKey)
- `POST /api/auth/refresh` - Silently re-authenticate to renew an expired authKey (no PIN needed)
- `POST /api/auth/verify-pin` - Verify a PIN without logging in

## Project Structure

```
stremio-web/
├── server/
│   ├── index.js              # Express server
│   ├── routes/
│   │   ├── profiles.js       # Profile management API
│   │   └── auth.js           # Authentication API
│   ├── utils/
│   │   └── encryption.js     # AES-256 encryption utilities
│   └── data/
│       └── profiles.json     # Profile storage
├── src/
│   ├── routes/
│   │   └── ProfileSelector/  # Profile selector UI
│   └── ...                   # Original Stremio Web source
├── .env                      # Environment variables
└── build/                    # Built frontend (after pnpm build)
```

## Security Notes

- **Never commit** your `.env` file or `profiles.json` with real credentials
- Use a strong, random 32-character encryption key
- The encryption key must remain the same, or you won't be able to decrypt existing passwords
- Profile passwords are encrypted at rest but decrypted when logging in to Stremio API
- PIN codes are stored in plain text (4-digit codes for quick verification)

## Troubleshooting

### "ENCRYPTION_KEY must be exactly 32 characters"

Make sure your `.env` file contains a valid 32-character encryption key:

```env
ENCRYPTION_KEY=abcdefghijklmnopqrstuvwxyz123456
```

### "Failed to load profiles"

Check that `server/data/profiles.json` exists and contains valid JSON.

### "Stremio login failed"

- Verify your Stremio email and password are correct
- Check that the encrypted password was generated with the correct encryption key
- Ensure the Stremio API is accessible (`https://api.strem.io/api`)

### Profile selector doesn't show

Clear your browser's localStorage and refresh:

```javascript
// In browser console:
localStorage.clear();
location.reload();
```

## Building the Android APK

The project includes a GitHub Actions workflow for building APKs.

### One-click build (manual trigger)

1. Go to **Actions → Build APK** on GitHub
2. Click **"Run workflow"**
3. Optionally set a version name (default: `dev`)
4. Download the APKs from the **Artifacts** section once the build completes

### Automatic release build (via git tag)

Push a version tag to trigger a full release with GitHub Release + APK download links:

```bash
git tag v1.0.0
git push origin v1.0.0
```

### Optional: APK signing

For signed APKs, add these repository secrets (Settings → Secrets and variables → Actions):

| Secret | Description |
|---|---|
| `KEYSTORE_BASE64` | Base64-encoded `.jks` keystore file |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_ALIAS` | Key alias inside the keystore |
| `KEY_PASSWORD` | Key password |

Without these secrets the workflow still builds successfully — it just produces an unsigned APK.

## License

This fork maintains the original GPLv2 license from Stremio Web.

Copyright (C) 2017-2023 Smart code 203358507
