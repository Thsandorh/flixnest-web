# Stremio Profile Switcher - Server Setup

## Overview

This is a forked version of Stremio Web with built-in profile switching functionality. The server provides a Netflix-style profile selector and manages authentication through the Stremio API.

## Features

- 🎭 **Profile Switching**: Netflix-style profile selector with avatar support
- 🔐 **PIN Protection**: Optional PIN codes for individual profiles
- 🔒 **Encrypted Storage**: Profile passwords encrypted with AES-256
- 🌐 **Stremio API Integration**: Seamless login proxy to official Stremio API
- 📱 **Responsive UI**: Works on desktop, mobile, and TV

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

Edit `server/data/profiles.json` to add your Stremio accounts:

```json
[
    {
        "id": "profile_1",
        "name": "John",
        "avatar": "avatar1.png",
        "email": "john@example.com",
        "encryptedPassword": "",
        "pin": null
    }
]
```

**Important**: Leave `encryptedPassword` empty initially. You can add profiles through the API or manually encrypt passwords using the encryption utility.

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

## Next Steps

- **Phase 2**: Login flow modifications, profile switch button, logout redirect
- **Phase 3**: Android APK for TV and mobile
- **Phase 4**: PIN management UI, avatar selector, profile admin interface

## License

This fork maintains the original GPLv2 license from Stremio Web.

Copyright (C) 2017-2023 Smart code 203358507
