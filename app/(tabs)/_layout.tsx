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
                    <View style={[StyleSheet.absoluteFill, { borderRadius: 35, overflow: 'hidden' }]}>
                        <BlurView
                            intensity={90} // Increased intensity
                            tint="light"
                            style={StyleSheet.absoluteFill}
                        />
                    </View>
                ),
                tabBarStyle: {
                    position: 'absolute',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', // More opaque
                    borderTopWidth: 1, // Add border
                    borderLeftWidth: 1,
                    borderRightWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: 'rgba(0, 0, 0, 0.1)', // Subtle outline
                    elevation: 10,
                    height: 70,
                    bottom: 30,
                    marginHorizontal: 20,
                    borderRadius: 35, // Slightly more rounded to match height/2
                    paddingBottom: 0,
                    paddingTop: 0,
                    // Stronger shadow for floating effect
                    shadowColor: '#0F172A', // Using text color for shadow
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.25, // Increased from 0.15
                    shadowRadius: 25, // Increased from 20
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
