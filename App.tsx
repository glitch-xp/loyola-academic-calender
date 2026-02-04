import { ExpoRoot } from 'expo-router';

export default function App() {
    const ctx = require.context('./app') as any;
    return <ExpoRoot context={ctx} />;
}