
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';

import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';



import HomeScreen from '../screens/HomeScreen';
import CompanyScreen from '../screens/CompanyScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AddCompanyScreen from '../screens/AddCompanyScreen';
import AdminScreen from '../screens/AdminScreen';
import AdminVillesScreen from '../screens/AdminVillesScreen';
import AdminCategorie from '../screens/AdminCategorie';
import AdminUserScreen from '../screens/AdminUserScreen';
import ProDashbordScreen from '..//screens/ProDashbordScreen'
import AdminEntrepriseScreen from '../screens/AdminEntrepriseScreen';
import CompanyVehiculeScreen from '../screens/CompanyVehiculeScreen';
import PlaceScreen from '../screens/PlaceScreen';
import MesReservationsScreen from '../screens/MesReservationsScreen';
import AddVehiculeScreen from '../screens/AddVehiculeScreen';
import MesVehiculesScreen from '../screens/MesVehiculesScreen';
import ProReservation from '../screens/ProReservation';
import EditVehicule from '../screens/EditVehicule';
import TicketScreen from '../screens/TicketScreen';
import AddProduit from '../screens/Produits/AddProduit';
import CompanyProduits from '../screens/Produits/CompanyProduits';
import CartScreen from '../screens/Produits/CartScreen';
import OrderScreen from '../screens/Produits/Client/OrderScreen';
import ClientOrderScreen from '../screens/Produits/Client/ClientOrderScreen';
import ClientOrderDetail from '../screens/Produits/Client/ClientOrderDetail';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Stack pour l'application principale (quand connecté)
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Company" component={CompanyScreen} />
      <Stack.Screen name="AddCompany" component={AddCompanyScreen} />
      <Stack.Screen  name="ProDashbord" component={ProDashbordScreen}/>
      <Stack.Screen  name="CompanyVehicules" component={CompanyVehiculeScreen}/>
     <Stack.Screen  name='Places' component={PlaceScreen}/>
     <Stack.Screen name="MesReservations" component={MesReservationsScreen} /> 
     <Stack.Screen name="AddVehicle" component={AddVehiculeScreen} />
     <Stack.Screen name="MesVehicules" component={MesVehiculesScreen} />
     <Stack.Screen name="ProReservation" component={ProReservation} />
     <Stack.Screen name="EditVehicule" component={EditVehicule} />
     <Stack.Screen name="TicketScreen" component={TicketScreen}/>
     <Stack.Screen name="AddProduit" component={AddProduit} />
     <Stack.Screen name="CompanyProduits" component={CompanyProduits} />
     <Stack.Screen name='Order' component={OrderScreen}/>
     <Stack.Screen name='ClientOrders' component={ClientOrderScreen}/>
    <Stack.Screen name="ClientOrderDetail" component={ClientOrderDetail} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return(
    <Stack.Navigator screenOptions={{ headerShown: false}}>
      <Stack.Screen name="AdminDashbord" component={AdminScreen} />
      <Stack.Screen name="AdminVilles" component={AdminVillesScreen} />
      <Stack.Screen name="AdminCategorie" component={AdminCategorie} />
      <Stack.Screen name="AdminUser" component={AdminUserScreen} />
      <Stack.Screen name="AdminEntreprises" component={AdminEntrepriseScreen} />
    

    </Stack.Navigator>
  );
}

// Stack pour l'onglet Réservations (nécessaire pour pouvoir naviguer vers TicketScreen depuis là)
function ReservationsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MesReservationsHome" component={MesReservationsScreen} />
      <Stack.Screen name="TicketScreen" component={TicketScreen} />
    </Stack.Navigator>
  );
}

// Tabs pour l'application principale
function MainTabs() {
  const { user } = useAuth();
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  return (
     <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Accueil') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Profil') iconName = focused ? 'person' : 'person-outline';
          else if (route.name === 'Réservations') iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Favoris') iconName = focused ? 'heart' : 'heart-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007BFF',
        tabBarInactiveTintColor: '#95a5a6',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#f0f0f0',
          height: 45,
          paddingBottom: 0,
          paddingTop: 7,
           position: 'absolute', // ← Permet de coller en bas
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen name="Accueil" component={HomeStack} />
      <Tab.Screen name="Réservations" component={ReservationsStack} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
         <Tab.Screen
               name="Panier"
               component={CartScreen}
               options={{
                 tabBarIcon: ({ focused, color, size }) => (
                   <View>
                     <Ionicons name={focused ? 'cart' : 'cart-outline'} size={size} color={color} />
                     {itemCount > 0 && (
                       <View style={styles.badge}>
                         <Text style={styles.badgeText}>{itemCount}</Text>
                       </View>
                     )}
                   </View>
                 ),
               }}
             />

      {user?.role === 'admin' && (
        <Tab.Screen 
        name= 'admin'
        component={AdminStack}
        options={{
        tabBarLabel: 'Admin',
        tabBarIcon: ({ focused, color, size }) => (
        <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />
      ),
        }}
        />
      )}
    </Tab.Navigator>
    </SafeAreaView>
  );
}

// Stack pour l'authentification (quand déconnecté)
function AuthStack() {   // ← CE COMPOSANT DOIT ÊTRE DÉFINI ICI
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Navigation principale
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Écran de chargement
  }

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <AuthStack />}
       
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});