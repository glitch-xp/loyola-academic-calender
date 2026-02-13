import { withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator, MaterialTopTabNavigationOptions, MaterialTopTabNavigationEventMap } from '@react-navigation/material-top-tabs';
import { ParamListBase, TabNavigationState } from '@react-navigation/native';
import { TabBar } from '../../components/ui/TabBar';

const { Navigator } = createMaterialTopTabNavigator();

// Create a custom navigator that uses Material Top Tabs so we get swiping,
// but style it to look like bottom tabs.
export const MaterialTopTabs = withLayoutContext<
    MaterialTopTabNavigationOptions,
    typeof Navigator,
    TabNavigationState<ParamListBase>,
    MaterialTopTabNavigationEventMap
>(Navigator);

export default function TabLayout() {
    return (
        <MaterialTopTabs
            tabBar={props => <TabBar {...props} />}
            initialRouteName="home"
            tabBarPosition="bottom"
            screenOptions={{
                tabBarStyle: {
                    // This is handled by our custom TabBar, but we might need to set standard prop defaults
                },
                swipeEnabled: true,
            }}
        >
            <MaterialTopTabs.Screen
                name="home"
                options={{
                    title: 'Today',
                }}
            />
            <MaterialTopTabs.Screen
                name="calendar"
                options={{
                    title: 'Calendar',
                }}
            />
            <MaterialTopTabs.Screen
                name="settings"
                options={{
                    title: 'More',
                }}
            />
        </MaterialTopTabs>
    );
}
