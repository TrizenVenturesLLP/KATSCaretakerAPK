import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  Picker,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RoutesScreen = () => {
  const navigation = useNavigation();
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      setError(null);

      const [storedToken, storedUuid] = await Promise.all([
        AsyncStorage.getItem('authToken'),
        AsyncStorage.getItem('uuid')
      ]);

      if (!storedToken || !storedUuid) {
        throw new Error('Authentication required');
      }

      const token = storedToken.startsWith('Bearer ') ? storedToken : `Bearer ${storedToken}`;

      const response = await axios.get(
        `https://api.katsapp.com/api/caretaker/route/${storedUuid}?uuid=${storedUuid}`,
        {
          headers: {
            Authorization: token,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid response format');
      }

      // Format the routes data
      const formattedRoutes = response.data.map(route => ({
        id: route.routeInfo?.uuid || '',
        name: `${route.routeInfo?.from || ''} to ${route.routeInfo?.to || ''}`,
        start: route.routeInfo?.from || '',
        end: route.routeInfo?.to || '',
        totalStudents: route.kids?.length || 0,
        status: route.routeInfo?.status || 'Pending',
        routeInfo: route.routeInfo,
        driver: route.driver,
        caretaker: route.caretaker,
        kids: route.kids
      }));

      setRoutes(formattedRoutes);
      
    } catch (error) {
      console.error('Routes fetch error:', error);
      
      let errorMessage = 'Failed to load routes. ';
      if (error.response?.status === 401) {
        errorMessage += 'Please login again.';
        AsyncStorage.multiRemove(['authToken', 'uuid'])
          .then(() => navigation.navigate('Login'))
          .catch(clearError => console.error('Failed to clear credentials:', clearError));
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectedRoute = routes.find(route => route.id === selectedRouteId);

  const handleNavigate = () => {
    if (selectedRoute) {
      navigation.navigate("RouteDetails", { routeData: selectedRoute });
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchRoutes}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select a Route</Text>
        <Text style={styles.headerSubtitle}>Choose your assigned route to view details</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconBackground}>
            <MaterialIcons name="directions-bus" size={40} color="#FFF" />
          </View>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>
            Available Routes <Text style={styles.required}>*</Text>
          </Text>
          <View style={[styles.pickerContainer, selectedRouteId ? styles.pickerContainerActive : null]}>
            <MaterialIcons name="route" size={20} color="#FFF" style={styles.pickerIcon} />
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedRouteId}
                onValueChange={(itemValue) => setSelectedRouteId(itemValue)}
                style={styles.picker}
                dropdownIconColor="#FFF"
              >
                <Picker.Item label="-- Choose a Route --" value="" color="#9CA3AF"/>
                {routes.map((route) => (
                  <Picker.Item
                    key={route.id}
                    label={route.name}
                    value={route.id}
                    color="#111827"
                  />
                ))}
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, !selectedRouteId && styles.buttonDisabled]}
            onPress={handleNavigate}
            disabled={!selectedRouteId}
          >
            <MaterialIcons name="directions" size={20} color="#FFF" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>View Route Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default RoutesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2A2A72",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 30,
  },
  content: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flex: 1,
  },
  iconContainer: {
    alignItems: "center",
    marginTop: -40,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#2A2A72",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginLeft: 4,
  },
  required: {
    color: "#DC2626",
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A2A72",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#2A2A72",
    marginBottom: 24,
    overflow: "hidden",
  },
  pickerContainerActive: {
    borderColor: "#2A2A72",
    backgroundColor: "#2A2A72",
  },
  pickerIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  pickerWrapper: {
    flex: 1,
  },
  picker: {
    height: 50,
    color: "#FFF",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2A2A72",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#2A2A72",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonDisabled: {
    backgroundColor: "#A3A3C2",
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2A2A72',
  },
  navText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  navTextActive: {
    color: '#2A2A72',
    fontWeight: '600',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  retryButton: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#2A2A72',
    fontSize: 16,
    fontWeight: '600',
  },
});
