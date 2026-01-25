import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import ConversasScreen from './src/screens/ConversasScreen';
import ChatScreen from './src/screens/ChatScreen';
import IAScreen from './src/screens/IAScreen';
import PerfilScreen from './src/screens/PerfilScreen';
import MissoesScreen from './src/screens/MissoesScreen';
import { ComBadgeNovo } from './src/components/BadgeNovo';
import { colors } from './src/theme/whatsapp';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Placeholder screens
function StatusScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <Text style={{ color: colors.textSecondary }}>Status (em breve)</Text>
    </View>
  );
}

function ChamadasScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <Text style={{ color: colors.textSecondary }}>Chamadas (em breve)</Text>
    </View>
  );
}

// Tab Navigator
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.textLight,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Conversas"
        component={ConversasScreen}
        options={{
          title: 'Saraiva.AI',
          tabBarLabel: 'Conversas',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>💬</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Missoes"
        component={MissoesScreen}
        options={{
          title: 'Missoes',
          tabBarLabel: 'Missoes',
          tabBarIcon: ({ color, size }) => (
            <ComBadgeNovo featureId="aba_missoes" posicao="topRight" tamanho="pequeno">
              <Text style={{ fontSize: size, color }}>🎯</Text>
            </ComBadgeNovo>
          ),
          headerStyle: {
            backgroundColor: colors.iaAccent,
          },
          tabBarActiveTintColor: colors.iaAccent,
        }}
      />
      <Tab.Screen
        name="Chamadas"
        component={ChamadasScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📞</Text>
          ),
        }}
      />
      <Tab.Screen
        name="IA"
        component={IAScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <ComBadgeNovo featureId="aba_ia" posicao="topRight" tamanho="pequeno">
              <Text style={{ fontSize: size, color }}>✨</Text>
            </ComBadgeNovo>
          ),
          tabBarActiveTintColor: colors.iaAccent,
        }}
      />
    </Tab.Navigator>
  );
}

// Main Stack Navigator
export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.primary,
          },
          headerTintColor: colors.textLight,
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={({ route }: any) => ({
            title: route.params?.nome || 'Chat',
          })}
        />
        <Stack.Screen
          name="Perfil"
          component={PerfilScreen}
          options={({ route }: any) => ({
            title: route.params?.nome || 'Perfil',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
