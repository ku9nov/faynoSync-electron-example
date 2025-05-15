# faynoSync-electron-example

A desktop application built with Electron that demonstrates integration with faynoSync update system.

## Prerequisites

- Node.js >= 18.13.0
- npm >= 8.19.3

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ku9nov/faynoSync-electron-example.git
cd faynoSync-electron-example
```

2. Install dependencies:
```bash
npm install
```

## Configuration

### Environment Variables

You have two options for configuration:

#### Option 1: Using .env.example
Simply copy the example environment file:
```bash
cp .env.example .env
```

#### Option 2: Manual Configuration
Create a `.env` file in the root directory with the following variables:
```env
APP_NAME=your_app_name
VERSION=0.0.1
CHANNEL=nightly
OWNER=admin
```

### Package Configuration

You can also configure the application through `package.json`. Note that if you configure both `.env` and `package.json`, the `package.json` values will take precedence.

Update the following fields in `package.json`:
- `name`: Your application name
- `version`: Current version of your application

## Development

To start the application in development mode:
```bash
npm start
```

The application window will appear with the message "Hello, world!" and will check for updates or click the check for update button.

## Building the Application

### For macOS
```bash
npm run dist:mac
```

### For Windows
```bash
npm run dist:win
```

### For Linux
```bash
npm run dist:linux
```

The built applications will be available in the `dist` directory.

## Build Outputs

- macOS: `.dmg` and `.zip` files
- Windows: `.exe` (NSIS installer) and `.zip` files
- Linux: `.AppImage` and `.deb` files

