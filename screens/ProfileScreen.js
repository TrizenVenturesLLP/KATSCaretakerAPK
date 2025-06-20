import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Platform,
  Dimensions,
} from "react-native";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uuid, setUuid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    alternatePhone: "",
    aadhar: "",
    address: "",
    dob: "",
    role: "caretaker",
    profilePicture: "",
    aadharFrontImage: "",
    aadharBackImage: "",
    id: "",
    uuid: ""
  });

  const navigation = useNavigation();

  const fetchProfileData = async (token, userUuid) => {
    try {
      // Log initial state
      console.log('=== Starting Profile Fetch ===');
      console.log('Initial Auth State:', {
        token: token ? `${token.substring(0, 20)}...` : null,
        uuid: userUuid,
        tokenStartsWithBearer: token?.startsWith('Bearer '),
        tokenLength: token?.length
      });

      if (!token || !userUuid) {
        console.log('Missing auth in fetchProfileData:', { 
          hasToken: !!token, 
          hasUuid: !!userUuid,
          tokenType: typeof token,
          uuidType: typeof userUuid
        });
        setLoading(false);
        return;
      }

      // Validate token format
      if (!token.startsWith('Bearer ')) {
        console.log('Adding Bearer prefix to token');
        token = `Bearer ${token}`;
      }

      // Log request details
      const requestConfig = {
        url: `https://api.katsapp.com/api/caretaker/${userUuid}?uuid=${userUuid}`,
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };
      
      console.log('Making profile request with:', {
        endpoint: requestConfig.url,
        headers: {
          Authorization: `${token.substring(0, 20)}...`,
          'Content-Type': requestConfig.headers['Content-Type'],
          'Accept': requestConfig.headers['Accept']
        },
        uuid: userUuid
      });

      const response = await axios.get(requestConfig.url, {
        headers: requestConfig.headers
      });

      // Log response details
      console.log('Profile Response:', {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        success: response.data?.success,
        message: response.data?.message,
        hasUserData: !!response.data?.data
      });

      if (!response.data) {
        console.error('No data in response');
        throw new Error('No data received from server');
      }

      if (!response.data.success) {
        console.error('Response indicates failure:', response.data);
        throw new Error(response.data.message || 'Failed to fetch profile data');
      }

      const userData = response.data.data;
      if (!userData) {
        console.error('No user data in successful response');
        throw new Error('No user data in response');
      }

      // Log user data structure
      console.log('User Data Structure:', {
        availableFields: Object.keys(userData),
        hasName: !!userData.name,
        hasEmail: !!userData.email,
        hasPhone: !!userData.phoneNumber,
        hasUuid: !!userData.uuid,
        role: userData.role
      });

      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phoneNumber || "",
        alternatePhone: userData.alternatePhoneNumber || "",
        aadhar: userData.aadharNo?.toString() || "",
        address: userData.address || "",
        dob: userData.dob ? userData.dob.split('T')[0] : "",
        role: userData.role || "caretaker",
        profilePicture: userData.profilePicture || "",
        aadharFrontImage: userData.aadharFrontImage || "",
        aadharBackImage: userData.aadharBackImage || "",
        id: userData._id || "",
        uuid: userData.uuid || ""
      });

      console.log('Successfully loaded and set profile data');

    } catch (error) {
      // Enhanced error logging
      console.error('Profile fetch error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        response: {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        },
        request: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      
      let errorMessage = 'Failed to load profile data. ';
      if (error.response?.status === 401) {
        errorMessage += 'Please login again.';
        // Clear stored credentials on auth error
        AsyncStorage.multiRemove(['authToken', 'uuid'])
          .then(() => {
            console.log('Cleared stored credentials due to auth error');
            setIsAuthenticated(false);
          })
          .catch(clearError => {
            console.error('Failed to clear credentials:', clearError);
          });
      } else if (error.response?.status === 500) {
        errorMessage += 'Server error. Please try again.';
      } else {
        errorMessage += error.response?.data?.message || 'Please try again.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadAuthAndFetchProfile = async () => {
      console.log('=== Starting Auth Load ===');
      try {
        const [storedToken, storedUuid] = await Promise.all([
          AsyncStorage.getItem('authToken'),
          AsyncStorage.getItem('uuid')
        ]);

        console.log('Loaded auth data:', {
          hasToken: !!storedToken,
          tokenStartsWithBearer: storedToken?.startsWith('Bearer '),
          tokenLength: storedToken?.length,
          hasUuid: !!storedUuid,
          uuidLength: storedUuid?.length,
          uuidValue: storedUuid
        });

        if (storedToken && storedUuid) {
          setAuthToken(storedToken);
          setUuid(storedUuid);
          setIsAuthenticated(true);
          await fetchProfileData(storedToken, storedUuid);
        } else {
          console.log('Missing credentials:', {
            hasToken: !!storedToken,
            hasUuid: !!storedUuid
          });
          setIsAuthenticated(false);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth loading error:', {
          message: error.message,
          stack: error.stack
        });
        setIsAuthenticated(false);
        setLoading(false);
      }
    };

    loadAuthAndFetchProfile();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove(['authToken', 'uuid']);
            setIsAuthenticated(false);
            navigation.replace('Login');
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        }
      }
    ]);
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2A2A72" />
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.headerText}>Profile</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity onPress={toggleEditMode} style={styles.editButton}>
                  <MaterialIcons name={editMode ? "close" : "edit"} size={24} color="#2A2A72" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                  <MaterialIcons name="logout" size={24} color="#2A2A72" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.profileSection}>
              <View style={styles.profileImageContainer}>
                <Image
                  source={
                    formData.profilePicture
                      ? { uri: formData.profilePicture }
                      : require('../assets/profile-pic.png')
                  }
                  style={styles.profileImage}
                />
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={[styles.input, !editMode && styles.disabledInput]}
                    value={formData.name}
                    onChangeText={(text) => handleInputChange('name', text)}
                    editable={editMode}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={[styles.input, !editMode && styles.disabledInput]}
                    value={formData.email}
                    onChangeText={(text) => handleInputChange('email', text)}
                    editable={editMode}
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput
                    style={[styles.input, !editMode && styles.disabledInput]}
                    value={formData.phone}
                    onChangeText={(text) => handleInputChange('phone', text)}
                    editable={editMode}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Alternate Phone Number</Text>
                  <TextInput
                    style={[styles.input, !editMode && styles.disabledInput]}
                    value={formData.alternatePhone}
                    onChangeText={(text) => handleInputChange('alternatePhone', text)}
                    editable={editMode}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Aadhar Number</Text>
                  <TextInput
                    style={[styles.input, !editMode && styles.disabledInput]}
                    value={formData.aadhar}
                    onChangeText={(text) => handleInputChange('aadhar', text)}
                    editable={editMode}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, !editMode && styles.disabledInput]}
                    value={formData.address}
                    onChangeText={(text) => handleInputChange('address', text)}
                    editable={editMode}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Date of Birth</Text>
                  <TextInput
                    style={[styles.input, !editMode && styles.disabledInput]}
                    value={formData.dob}
                    onChangeText={(text) => handleInputChange('dob', text)}
                    editable={editMode}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2A2A72',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    marginRight: 16,
  },
  logoutButton: {
    marginLeft: 8,
  },
  profileSection: {
    padding: 16,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
  },
  formContainer: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  disabledInput: {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
  },
}); 