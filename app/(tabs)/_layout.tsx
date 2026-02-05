import { Tabs } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Home, Calendar, Menu } from 'lucide-react-native';
import { Platform, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

export default function TabLayout() {
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarBackground: () => (
                    <View style={[StyleSheet.absoluteFill, { borderRadius: 30, overflow: 'hidden' }]}>
                        <BlurView
                            intensity={80}
                            tint="light"
                            style={StyleSheet.absoluteFill}
                        />
                    </View>
                ),
                tabBarStyle: {
                    position: 'absolute',
                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    borderTopWidth: 0,
                    elevation: 0,
                    height: 70, // Fixed height for pill shape
                    bottom: 30, // Float above bottom
                    marginHorizontal: 20, // Float from sides
                    borderRadius: 30, // Pill shape
                    paddingBottom: 0, // Center icons vertically
                    paddingTop: 0,
                    // Stronger shadow for floating effect
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.15,
                    shadowRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                tabBarItemStyle: {
                    height: 70, // Match bar height
                    paddingVertical: 10,
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textLight,
                tabBarLabelStyle: {
                    fontWeight: '600',
                    fontSize: 10,
                    marginTop: 0,
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Today',
                    tabBarIcon: ({ color }) => <Home size={26} color={color} />,
                }}
            />
            <Tabs.Screen
                name="calendar"
                options={{
                    title: 'Calendar',
                    tabBarIcon: ({ color }) => <Calendar size={26} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'More',
                    tabBarIcon: ({ color }) => <Menu size={26} color={color} />,
                }}
            />
        </Tabs>
    );
}
