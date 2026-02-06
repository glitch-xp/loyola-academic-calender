# 📚 Loyola Time Table App

[![Open Web (iOS)](https://img.shields.io/badge/Open%20Web-iOS-blue?style=for-the-badge&logo=safari)](https://glitch-xp.github.io/loyola-academic-calender/)
[![Download APK (Android)](https://img.shields.io/badge/Download%20APK-Android-green?style=for-the-badge&logo=android)](https://github.com/glitch-xp/loyola-academic-calender/releases/latest)
[![Contact Support](https://img.shields.io/badge/Contact-Support-orange?style=for-the-badge&logo=mail.ru)](https://yuvaraja.com/#contact)
[![Report Issue](https://img.shields.io/badge/Report-Issue-red?style=for-the-badge&logo=github)](https://github.com/glitch-xp/loyola-academic-calender/issues/new)

Your personal assistant for managing classes, schedules, and academic life at Loyola College.

## 🌟 What Does This App Do?

The Loyola Academic Companion helps you:

- **📅 See Your Schedule** - Know exactly what class you have next and when
- **� Check Your Calendar** - View all your academic events and holidays in one place
- **🔔 Stay Organized** - Never miss a class with automatic timetable syncing
- **📱 Work Offline** - Access your schedule even without internet

## 📱 How to Use This App

### For Students (Just Want to Use the App)

1. **Download the App**
   - Get the latest version from the [Releases page](../../releases)
   - Install the APK file on your Android phone
   - Open the app and select your department and year
   - That's it! Your schedule is ready

2. **Using the App**
   - **Home Tab** 🏠 - See today's classes and what's coming next
   - **Calendar Tab** 📅 - View the full academic calendar
   - **Settings Tab** ⚙️ - Change your course or preferences

---

## 👨‍💻 For Developers

### What You'll Need

To work on this project, you'll need to install:
- **Node.js** - The programming platform (download from nodejs.org)
- **A Code Editor** - Like Visual Studio Code
- **Expo Go App** - On your phone for testing (free from app stores)

### Getting Started with Development

**Step 1: Get the Code**
```bash
# Download this project to your computer
git clone https://github.com/glitch-xp/loyola-academic-calender
cd loyola-academic-calender
```

**Step 2: Install Everything**
```bash
# This downloads all the necessary files
npm install
```

**Step 3: Start Working**
```bash
# This starts the app in development mode
npm run dev
```

**Step 4: Test on Your Phone**
- Open the Expo Go app on your phone
- Scan the QR code that appears
- The app will open on your phone!

### Understanding the Code Structure

Here's where everything lives:

- **`app/`** - The main screens you see (Home, Calendar, Settings)
- **`components/`** - Reusable buttons, cards, and UI pieces
- **`constants/`** - Colors and fixed values (like Loyola Blue!)
- **`services/`** - Code that fetches your timetable data
- **`types/`** - Definitions that help prevent bugs

### Common Commands

| What You Want to Do | Command to Run |
|---------------------|----------------|
| Start the app | `npm run dev` |
| Test on Android | `npm run android` |
| Test on iPhone | `npm run ios` |
| Check for errors | `npm run typecheck` |

### Making Changes

**Want to change colors?**
- Look in `constants/Colors.ts`

**Want to modify a screen?**
- Home screen: `app/(tabs)/home.tsx`
- Calendar screen: `app/(tabs)/calendar.tsx`
- Settings screen: `app/(tabs)/settings.tsx`

**Want to change where data comes from?**
- Check `services/DataService.ts`

## 🎨 Design Philosophy

This app is designed with:
- **Simplicity First** - Clean and easy to understand
- **Smooth Experience** - Nice animations and easy navigation
- **Offline Ready** - Works even without internet

## 🆘 Need Help?

- **Found a bug?** - Create an issue on GitHub
- **Have a suggestion?** - We'd love to hear it!
- **Want to contribute?** - Check the Contributing section below

## 🤝 How to Contribute Data

We need your help to add more departments and years! If you have a timetable, you can easily convert it to our format using AI.

### Protocol to Convert Timetable
1. Take a clear photo or screenshot of your timetable.
2. Use ChatGPT, Claude, or Gemini.
3. **Copy and paste the following prompt along with your image:**

```text
Extract the timetable from this image/PDF into the following JSON format.
The JSON keys should be '1' through '6' representing the Day Orders (Day 1 to Day 6).
Each Day Order key should contain an array of objects representing the periods in order (usually 5 periods per day).

Each object should have:
- `name`: The name of the subject (string)
- `code`: The subject code (string). If the code is not visible, use "NA".

Example JSON Structure:
{
  "1": [
    { "name": "SUBJECT NAME", "code": "SUBCODE" },
    { "name": "ANOTHER SUBJECT", "code": "SUBCODE" },
    ...
  ],
  "2": [ ... ],
  ...
  "6": [ ... ]
}

Output ONLY the raw JSON.
```
4. Copy the JSON output and submit it via a Pull Request or create an Issue with the JSON attached.

## 🤝 How to Contribute Code

Want to make this app better? Here's how:

1. **Fork** - Make your own copy of this project
2. **Create** - Make your changes on a new branch
3. **Test** - Make sure everything still works
4. **Submit** - Send us a pull request with your improvements

We welcome contributions from everyone, whether you're fixing typos or adding major features!

## � Learn More

New to React Native or Expo? Here are some helpful resources:
- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## � Privacy & License

This is a student project for Loyola College. Your data stays on your device.

---

*Questions? Reach out through GitHub issues or discussions!*
