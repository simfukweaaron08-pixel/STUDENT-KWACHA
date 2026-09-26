# Student Kwacha - Flutter App

Android-first mobile budgeting application for the Zambian market.

## Setup

```bash
flutter pub get
flutter run
```

## Architecture

- **lib/core/** — Services (API, Auth, Storage), Providers (state management)
- **lib/data/** — Data models and repositories
- **lib/presentation/** — UI screens organized by feature

## Features

- 📊 Dashboard with financial summary
- 💰 Transaction tracking (manual + mobile money sync)
- 📈 Budget management with progress tracking
- 🎯 Savings goals with predictions
- 📉 Analytics with charts
- 📱 Offline support (Hive)
- 🔔 Push notifications
- 🔐 Secure JWT authentication

## Configuration

Set the API base URL in `lib/core/services/api_service.dart`:
- Android emulator: `http://10.0.2.2:3300/api/v1`
- Physical device: `http://<your-ip>:3300/api/v1`

The default base URL is baked in as `http://192.168.0.189:3300/api/v1` (dev
machine's LAN IP + the backend's `PORT` from `apps/backend-api/.env`). To point
the app somewhere else without editing code, pass it at launch:

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3300/api/v1
```

Note: `PORT` in `apps/backend-api/.env` is `3300`, not 3000.
