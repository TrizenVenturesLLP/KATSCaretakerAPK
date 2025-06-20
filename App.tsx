/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */


import React from "react";
import { Text, Linking } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import RoutesScreen from "./screens/RoutesScreen";
import RouteDetailsScreen from "./screens/RouteDetailsScreen";
import KidDetailsScreen from "./screens/KidDetailsScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import ConfirmPasswordScreen from "./screens/ConfirmPasswordScreen";
import ResetPasswordScreen from "./screens/ResetPasswordScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === "Profile") {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === "My Routes") {
            iconName = focused ? 'map' : 'map-outline';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#2A2A72",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="My Routes" component={RoutesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const config = {
  screens: {
    ConfirmPassword: {
      path: 'confirm-password',
      parse: {
        token: token => token
      },
    },
    Login: 'login',
    ForgotPassword: 'forgot-password',
    ResetPassword: 'reset-password',
    MainTabs: {
      screens: {
        Home: 'home',
        'My Routes': 'routes',
        Profile: 'profile',
      },
    },
    RouteDetails: 'route-details',
    KidDetails: 'kid-details',
  },
};

export default function App() {
  const linking = {
    prefixes: ['kats://'],
    config,
    async getInitialURL() {
      try {
        const url = await Linking.getInitialURL();
        if (url != null) {
          console.log('Initial deep link URL:', url);
          return url;
        }
        return null;
      } catch (err) {
        return null;
      }
    },
    subscribe(listener) {
      const subscription = Linking.addEventListener('url', ({ url }) => {
        console.log('Received deep link URL:', url);
        listener(url);
      });

      return () => {
        subscription.remove();
      };
    },
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer linking={linking} fallback={<Text>Loading...</Text>}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ConfirmPassword" component={ConfirmPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="RouteDetails" component={RouteDetailsScreen} />
          <Stack.Screen name="KidDetails" component={KidDetailsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
