# 📚 Loyola Academic Companion

A modern React Native mobile application built with Expo to help Loyola students manage their academic calendar, timetables, and daily schedules.

## ✨ Features

- **🎓 Multi-Course Selection**: Support for multiple departments and year selections
- **📅 Dynamic Dashboard**: 
  - Automatic day order detection
  - Real-time timetable display
  - Next class/event notifications
- **🗓️ Interactive Calendar**: 
  - Event highlighting
  - Academic calendar integration
  - Day-wise schedule view
- **🎨 Loyola-Themed UI**: 
  - Custom "Loyola Blue" and gold color scheme
  - Soft Material UI with pastel colors
  - Smooth animations and transitions
- **📱 Bottom Tab Navigation**: Easy access to Home, Calendar, and Settings
- **💾 Offline Mode**: Works offline with service workers
- **⚙️ Settings**: Course reset and preference management
- **🌐 Data Sync**: Fetches latest timetable data from GitHub repository

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- For Android builds: Java Development Kit (JDK)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Run on your device**
   - Install the Expo Go app on your mobile device
   - Scan the QR code displayed in the terminal
   - Or press `a` for Android emulator, `i` for iOS simulator

## 📱 Building for Production

### Android APK

1. **Using Docker** (Recommended)
   ```bash
   docker build -t loyola-apk-builder .
   docker run -v $(pwd):/app loyola-apk-builder
   ```

2. **Manual Build**
   ```bash
   npm run android
   # APK will be generated in android/app/build/outputs/apk/
   ```

### Automated Deployment

The project includes GitHub Actions workflows for automated builds and deployments. APKs are automatically built and published to GitHub Releases on every push to the main branch.

## 🏗️ Project Structure

```
project/
├── app/                    # App screens and routing (Expo Router)
│   ├── index.tsx          # Entry point and navigation logic
│   ├── welcome.tsx        # Onboarding screen
│   └── (tabs)/            # Tab navigation screens
│       ├── home.tsx       # Dashboard/Home screen
│       ├── calendar.tsx   # Calendar screen
│       └── settings.tsx   # Settings screen
├── components/            # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   └── ...
├── constants/             # App constants
│   └── Colors.ts          # Color theme definitions
├── services/              # Data services
│   ├── DataService.ts     # GitHub data fetching
│   └── StorageService.ts  # Local storage management
├── types/                 # TypeScript type definitions
│   └── index.ts
├── utils/                 # Utility functions
├── assets/                # Static assets (images, fonts)
├── android/               # Android native code
├── .github/               # GitHub workflows
└── Dockerfile             # Docker configuration for APK builds
```

## 🎨 Tech Stack

- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **Routing**: Expo Router
- **State Management**: React Hooks
- **Storage**: AsyncStorage
- **UI Components**: Custom components with Soft Material design
- **Icons**: Lucide React Native
- **Date Handling**: date-fns
- **HTTP Client**: Fetch API
- **Build System**: Expo EAS Build / Docker

## ⚙️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with telemetry disabled |
| `npm run android` | Run on Android emulator/device |
| `npm run ios` | Run on iOS simulator/device |
| `npm run build:web` | Build for web platform |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |

## 🔧 Configuration

### Color Theme

The app uses a custom color scheme defined in [`constants/Colors.ts`](./constants/Colors.ts):
- **Primary**: Loyola Blue
- **Secondary**: Gold
- **Background**: Soft pastels for a Material UI feel

### Data Sources

Timetable and calendar data is fetched from a GitHub repository. Configuration can be found in the data services.

## 🐛 Error Handling

The app includes comprehensive error handling:
- **No Network Screen**: Displayed when offline
- **Error Screen**: Catches and displays general errors
- **Retry Functionality**: Allows users to retry failed operations

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 👨‍💻 Development

### Code Style

- Use TypeScript for type safety
- Follow React Native best practices
- Use functional components with hooks
- Keep components focused and reusable

### Testing

Run type checking before committing:
```bash
npm run typecheck
```

## 🐳 Docker Support

The project includes Docker support for building Android APKs in a consistent environment. See [`Dockerfile`](./Dockerfile) for details.

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

Made with ❤️ for Loyola students
