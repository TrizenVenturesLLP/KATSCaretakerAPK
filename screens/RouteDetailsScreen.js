import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  Linking,
  PermissionsAndroid,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { launchCamera } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Geolocation from '@react-native-community/geolocation';

// Helper function to convert attendance type to backend format
const getAttendanceType = (type) => {
  switch(type?.toLowerCase()) {
    case 'home pickup': return 'homePickup';
    case 'home drop': return 'homeDrop';
    case 'institute pickup': return 'institutePickup';
    case 'institute drop': return 'instituteDrop';
    case 'absent': return 'absent';
    default: return type?.toLowerCase() || '';
  }
};

const RouteDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { routeData } = route.params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [routeDetails, setRouteDetails] = useState(null);
  const [selectedKidId, setSelectedKidId] = useState(null);
  const [selectedKid, setSelectedKid] = useState(null);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [attendanceData, setAttendanceData] = useState({
    userProfileUuid: "",
    date: new Date().toISOString().split("T")[0],
    type: "",
    pickupTime: "",
    image: null,
    latitude: "",
    longitude: ""
  });
  const [headerHeight] = useState(new Animated.Value(0));
  const scrollY = useRef(new Animated.Value(0)).current;
  const [submitting, setSubmitting] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchDate, setSearchDate] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  const headerTranslate = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -30],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    fetchRouteDetails();
  }, []);

  const fetchRouteDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const [storedToken, storedUuid] = await Promise.all([
        AsyncStorage.getItem('authToken'),
        AsyncStorage.getItem('uuid')
      ]);

      console.log('Loaded auth data for routes:', {
        hasToken: !!storedToken,
        tokenStartsWithBearer: storedToken?.startsWith('Bearer '),
        tokenLength: storedToken?.length,
        hasUuid: !!storedUuid,
        uuidLength: storedUuid?.length
      });

      if (!storedToken || !storedUuid) {
        throw new Error('Authentication required');
      }

      const token = storedToken.startsWith('Bearer ') ? storedToken : `Bearer ${storedToken}`;

      console.log('Making route details request:', {
        endpoint: `https://api.katsapp.com/api/caretaker/route/${storedUuid}?uuid=${storedUuid}`,
        headers: {
          Authorization: `${token.substring(0, 20)}...`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

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

      console.log('Route details raw response:', {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        isArray: Array.isArray(response.data),
        dataLength: Array.isArray(response.data) ? response.data.length : 0
      });

      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        throw new Error('No route data received from server');
      }

      // Extract the first route's details
      const routeData = response.data[0];
      console.log('Route data structure:', {
        hasRouteInfo: !!routeData.routeInfo,
        hasDriver: !!routeData.driver,
        hasCaretaker: !!routeData.caretaker,
        hasKids: !!routeData.kids,
        kidsCount: routeData.kids?.length || 0
      });

      // Format the data structure matching exact field names
      const formattedRouteDetails = {
        routeName: `${routeData.routeInfo?.from || ''} to ${routeData.routeInfo?.to || ''}`,
        routeUuid: routeData.routeInfo?.uuid,
        routeInfo: {
          from: routeData.routeInfo?.from,
          to: routeData.routeInfo?.to,
          location: routeData.routeInfo?.location
        },
        driverName: routeData.driver?.name || 'Not available',
        driverPhone: routeData.driver?.phoneNumber || 'Not available',
        driverProfilePic: routeData.driver?.profilePicture,
        caretakerName: routeData.caretaker?.name || 'Not available',
        caretakerPhone: routeData.caretaker?.phoneNumber || 'Not available',
        caretakerProfilePic: routeData.caretaker?.profilePicture,
        students: routeData.kids?.map(kid => ({
          uuid: kid.uuid,
          name: kid.kidName || 'Unknown',
          dob: kid.kidsDateOfBirth ? new Date(kid.kidsDateOfBirth).toLocaleDateString() : '',
          gender: kid.gender || ''
        })) || []
      };

      console.log('Formatted route details:', {
        routeName: formattedRouteDetails.routeName,
        studentsCount: formattedRouteDetails.students.length,
        sampleStudent: formattedRouteDetails.students[0]
      });

      setRouteDetails(formattedRouteDetails);

    } catch (error) {
      console.error('Route details fetch error:', {
        message: error.message,
        name: error.name,
        response: {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        }
      });
      
      let errorMessage = 'Failed to load route details. ';
      if (error.response?.status === 401) {
        errorMessage += 'Please login again.';
        AsyncStorage.multiRemove(['authToken', 'uuid'])
          .then(() => {
            console.log('Cleared stored credentials due to auth error');
            navigation.navigate('Login');
          })
          .catch(clearError => console.error('Failed to clear credentials:', clearError));
      } else if (error.response?.status === 500) {
        errorMessage += 'Server error. Please try again.';
      } else {
        errorMessage += error.response?.data?.message || error.message || 'Please try again.';
      }
      
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Add a function to fetch attendance data
  const fetchAttendanceData = async (kidUuid, date) => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      if (!storedToken) {
        throw new Error('Authentication required');
      }

      const token = storedToken.startsWith('Bearer ') ? storedToken : `Bearer ${storedToken}`;
      const formattedDate = date.toISOString().split('T')[0];

      const response = await axios.get(
        `https://api.katsapp.com/api/v1/kid-attendance/${kidUuid}/date/${formattedDate}`,
        {
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (response.status === 200 && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Fetch attendance error:', error);
      return null;
    }
  };

  const handleAttendanceSubmit = async () => {
    if (!attendanceData.type || !attendanceData.userProfileUuid) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      // Get stored token and uuid in parallel
      const [storedToken, storedUuid] = await Promise.all([
        AsyncStorage.getItem('authToken'),
        AsyncStorage.getItem('uuid')
      ]);

      if (!storedToken || !storedUuid) {
        throw new Error('Authentication required');
      }

      const token = storedToken.startsWith('Bearer ') ? storedToken : `Bearer ${storedToken}`;

      // Format the date and time for the API
      const currentDate = new Date();
      const formattedDate = currentDate.toISOString().split('T')[0];
      
      // Convert time to ISO format
      const [hours, minutes, period] = attendanceData.pickupTime.split(/:|\s/);
      let hour24 = parseInt(hours);
      if (period === 'PM' && hour24 !== 12) hour24 += 12;
      if (period === 'AM' && hour24 === 12) hour24 = 0;
      
      const pickupDateTime = new Date(formattedDate);
      pickupDateTime.setHours(hour24, parseInt(minutes));
      const pickupTimeISO = pickupDateTime.toISOString();

      // Create the request payload
      const requestData = new FormData();
      requestData.append('userProfileUuid', attendanceData.userProfileUuid);
      requestData.append('date', formattedDate);
      requestData.append('type', getAttendanceType(attendanceData.type));
      requestData.append('latitude', attendanceData.latitude || '');
      requestData.append('longitude', attendanceData.longitude || '');
      requestData.append('PickupTime', pickupTimeISO);

      // If there's an image, append it to the FormData
      if (attendanceData.imageInfo) {
        requestData.append('photo', {
          uri: attendanceData.imageInfo.uri,
          type: attendanceData.imageInfo.type,
          name: attendanceData.imageInfo.name,
        });
      }

      // Submit attendance
      const response = await axios.post(
        'https://api.katsapp.com/api/v1/kid-attendance',
        requestData,
        {
          headers: {
            'Authorization': token,
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json'
          }
        }
      );

      if (response.status === 200 || response.status === 201) {
        // Fetch updated attendance data
        const updatedAttendanceData = await fetchAttendanceData(selectedKid.uuid, currentDate);
        
        if (updatedAttendanceData) {
          setAttendanceRecords([updatedAttendanceData]);
          
          // Update attendance status based on the most recent activity
          const times = [
            { type: 'Home Pickup', time: updatedAttendanceData.homePickup?.pickupTime },
            { type: 'Home Drop', time: updatedAttendanceData.homeDrop?.dropTime },
            { type: 'Institute Pickup', time: updatedAttendanceData.institutePickup?.pickupTime },
            { type: 'Institute Drop', time: updatedAttendanceData.instituteDrop?.dropTime }
          ].filter(item => item.time);

          if (times.length > 0) {
            // Sort by time to get the most recent activity
            times.sort((a, b) => new Date(b.time) - new Date(a.time));
            const mostRecent = times[0];
            
            setAttendanceStatus(prev => ({
              ...prev,
              [selectedKid.uuid]: {
                type: mostRecent.type,
                time: formatTime(mostRecent.time),
                date: formattedDate
              }
            }));
          }
        }

        Alert.alert(
          'Success',
          'Attendance submitted successfully',
          [{ text: 'OK', onPress: () => {
            setShowAttendanceForm(false);
            // Clear the form data
            setAttendanceData(prev => ({
              ...prev,
              type: '',
              image: null,
              imageInfo: null
            }));
          }}]
        );
      } else {
        throw new Error('Failed to submit attendance');
      }

    } catch (error) {
      console.error('Attendance submission error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      let errorMessage = 'Failed to submit attendance. ';
      if (error.response?.status === 401) {
        errorMessage += 'Please login again.';
        AsyncStorage.multiRemove(['authToken', 'uuid'])
          .then(() => navigation.navigate('Login'))
          .catch(clearError => console.error('Failed to clear credentials:', clearError));
      } else if (error.response?.status === 500) {
        errorMessage += 'Server error. Please try again later.';
      } else {
        errorMessage += error.response?.data?.message || error.message || 'Please try again.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkAbsent = () => {
    setAttendanceData(prev => ({
      ...prev,
      type: "Absent",
      pickupTime: getCurrentTime(),
    }));
    handleAttendanceSubmit();
  };

  const handleCancelAttendance = () => {
    setShowAttendanceForm(false);
  };

  const getCurrentTime = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    hours = hours.toString().padStart(2, '0');
    return `${hours}:${minutes} ${ampm}`;
  };

  const handleAddAttendanceClick = async () => {
    const currentLocation = await getLocation();
    
    if (currentLocation) {
      setAttendanceData(prev => ({
        ...prev,
        pickupTime: getCurrentTime(),
        latitude: currentLocation.coords.latitude.toString(),
        longitude: currentLocation.coords.longitude.toString()
      }));
    } else {
      setAttendanceData(prev => ({
        ...prev,
        pickupTime: getCurrentTime(),
        latitude: "",
        longitude: ""
      }));
    }
    
    setShowAttendanceForm(true);
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "KATS needs access to your camera to take attendance photos.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      return true; // iOS handles permissions through Info.plist
    }
  };

  const handleTakePhoto = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
        return;
      }

      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
      });

      if (result.didCancel) {
        console.log('User cancelled camera');
      } else if (result.errorCode) {
        console.log('ImagePicker Error: ', result.errorMessage);
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      } else if (result.assets && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        setAttendanceData(prev => ({
          ...prev,
          image: photoUri
        }));
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  // Remove the complex scroll handling
  const onScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    scrollY.setValue(y);
  };

  // Add date picker handler
  const handleDateChange = async (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate && selectedKid) {
      setSearchDate(selectedDate);
      
      try {
        setIsLoadingAttendance(true);
        const storedToken = await AsyncStorage.getItem('authToken');
        
        if (!storedToken) {
          throw new Error('Authentication required');
        }

        const token = storedToken.startsWith('Bearer ') ? storedToken : `Bearer ${storedToken}`;
        const formattedDate = selectedDate.toISOString().split('T')[0];
        
        console.log('Fetching attendance for:', {
          kidUuid: selectedKid.uuid,
          date: formattedDate
        });

        const response = await axios.get(
          `https://api.katsapp.com/api/v1/kid-attendance/${selectedKid.uuid}/date/${formattedDate}`,
          {
            headers: {
              'Authorization': token,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        );

        console.log('Raw API Response:', response.data);
        console.log('Response Status:', response.status);

        // Check if we have any attendance records for this date
        const hasAttendanceRecords = response.data && (
          response.data.homePickup || 
          response.data.homeDrop || 
          response.data.institutePickup || 
          response.data.instituteDrop
        );

        if (response.status === 200 && hasAttendanceRecords) {
          const attendanceData = response.data;
          console.log('Processed Attendance Data:', {
            kidName: attendanceData.kidName,
            hasHomePickup: !!attendanceData.homePickup,
            hasInstituteDrop: !!attendanceData.instituteDrop,
            hasInstitutePickup: !!attendanceData.institutePickup,
            hasHomeDrop: !!attendanceData.homeDrop
          });

          setAttendanceRecords([attendanceData]);
          console.log('AttendanceRecords State Updated:', [attendanceData]);
          
          // Update attendance status based on the most recent activity
          const times = [
            { type: 'Home Pickup', time: attendanceData.homePickup?.pickupTime },
            { type: 'Home Drop', time: attendanceData.homeDrop?.dropTime },
            { type: 'Institute Pickup', time: attendanceData.institutePickup?.pickupTime },
            { type: 'Institute Drop', time: attendanceData.instituteDrop?.dropTime }
          ].filter(item => item.time);

          if (times.length > 0) {
            // Sort by time to get the most recent activity
            times.sort((a, b) => new Date(b.time) - new Date(a.time));
            const mostRecent = times[0];
            
            const statusUpdate = {
              type: mostRecent.type,
              time: formatTime(mostRecent.time),
              date: formattedDate
            };
            console.log('Updating attendance status:', statusUpdate);
            setAttendanceStatus(prev => ({
              ...prev,
              [selectedKid.uuid]: statusUpdate
            }));
          }
        } else {
          console.log('No attendance data found for this date');
          setAttendanceRecords([]);
          setAttendanceStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[selectedKid.uuid];
            return newStatus;
          });
        }
      } catch (error) {
        // Silently handle 404 errors for no attendance records
        if (error.response?.status === 404) {
          console.log('No attendance records available for the selected date');
          setAttendanceRecords([]);
          setAttendanceStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[selectedKid.uuid];
            return newStatus;
          });
          return; // Exit without showing error alert
        }
        
        console.error('Attendance fetch error:', {
          message: error.message,
          response: {
            status: error.response?.status,
            data: error.response?.data
          }
        });
        
        let errorMessage = 'Failed to fetch attendance records. ';
        if (error.response?.status === 401) {
          errorMessage += 'Please login again.';
          AsyncStorage.multiRemove(['authToken', 'uuid'])
            .then(() => navigation.navigate('Login'))
            .catch(clearError => console.error('Failed to clear credentials:', clearError));
        } else {
          errorMessage += error.message || 'Please try again.';
        }
        
        // Only show alert for non-404 errors
        if (error.response?.status !== 404) {
          Alert.alert('Error', errorMessage);
        }
      } finally {
        setIsLoadingAttendance(false);
      }
    }
  };

  // Helper function to format time in 12-hour format
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Helper function to format coordinates
  const formatLocation = (lat, long) => {
    return `${parseFloat(lat).toFixed(6)}, ${parseFloat(long).toFixed(6)}`;
  };

  // Add location permission and fetching function
  const getLocation = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "KATS needs access to your location to mark attendance.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setLocationError('Location permission denied');
          return null;
        }
      }

      return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setLocation({ latitude, longitude });
            setLocationError(null);
            resolve({ latitude, longitude });
          },
          (error) => {
            console.error('Location error:', error);
            setLocationError('Failed to get location');
            reject(error);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      });
    } catch (error) {
      console.error('Location permission error:', error);
      setLocationError('Failed to request location permission');
      return null;
    }
  };

  // Add this logging function
  const logAttendanceDetails = (attendanceData) => {
    if (!attendanceData) {
      console.log('No attendance data available for today');
      return;
    }

    console.log('\n=== Attendance Details ===');
    console.log('Kid Name:', attendanceData.kidName);
    console.log('Date:', new Date().toLocaleDateString());
    
    // Home Pickup
    if (attendanceData.homePickup) {
      console.log('\nHome Pickup:');
      console.log('- Time:', formatTime(attendanceData.homePickup.pickupTime));
      console.log('- Status:', attendanceData.homePickup.homeOnboard === "true" ? "Present" : "Absent");
      console.log('- Location:', attendanceData.homePickup.latitude ? 
        `${attendanceData.homePickup.latitude}, ${attendanceData.homePickup.longitude}` : 'No location');
    }

    // Institute Drop
    if (attendanceData.instituteDrop) {
      console.log('\nInstitute Drop:');
      console.log('- Time:', formatTime(attendanceData.instituteDrop.dropTime));
      console.log('- Status:', attendanceData.instituteDrop.instituteOffboard === "true" ? "Present" : "Absent");
      console.log('- Location:', attendanceData.instituteDrop.latitude ? 
        `${attendanceData.instituteDrop.latitude}, ${attendanceData.instituteDrop.longitude}` : 'No location');
    }

    // Institute Pickup
    if (attendanceData.institutePickup) {
      console.log('\nInstitute Pickup:');
      console.log('- Time:', formatTime(attendanceData.institutePickup.pickupTime));
      console.log('- Status:', attendanceData.institutePickup.instituteOnboard === "true" ? "Present" : "Absent");
      console.log('- Location:', attendanceData.institutePickup.latitude ? 
        `${attendanceData.institutePickup.latitude}, ${attendanceData.institutePickup.longitude}` : 'No location');
    }

    // Home Drop
    if (attendanceData.homeDrop) {
      console.log('\nHome Drop:');
      console.log('- Time:', formatTime(attendanceData.homeDrop.dropTime));
      console.log('- Status:', attendanceData.homeDrop.homeOffboard === "true" ? "Present" : "Absent");
      console.log('- Location:', attendanceData.homeDrop.latitude ? 
        `${attendanceData.homeDrop.latitude}, ${attendanceData.homeDrop.longitude}` : 'No location');
    }

    console.log('\n=== End of Attendance Details ===\n');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#A020F0" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchRouteDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Check if we have route data
  const hasRouteData = routeDetails && Object.keys(routeDetails).length > 0;
  if (!hasRouteData) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>No route details available</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchRouteDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{routeDetails?.routeName || 'Route Details'}</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.contentContainer}>
          {/* Route Staff Section */}
          <View style={styles.section}>
            <View style={styles.staffCard}>
              <View style={styles.staffInfo}>
                {routeDetails?.driverProfilePic ? (
            <Image 
              source={{ uri: routeDetails.driverProfilePic }} 
              style={styles.profilePic} 
            />
                ) : (
                  <View style={[styles.profilePicPlaceholder, styles.elevatedCard]}>
                    <MaterialIcons name="person" size={30} color="#FFF" />
                  </View>
                )}
                <View style={styles.staffDetails}>
                  <View style={styles.roleTag}>
                    <MaterialIcons name="drive-eta" size={14} color="#2A2A72" />
                    <Text style={styles.staffRole}>Driver</Text>
                  </View>
                  <Text style={styles.staffName}>{routeDetails?.driverName || 'Not available'}</Text>
                  <View style={styles.phoneContainer}>
                    <MaterialIcons name="phone" size={14} color="#6B7280" />
                    <Text style={styles.staffPhone}>{routeDetails?.driverPhone || 'Not available'}</Text>
                  </View>
                </View>
          </View>
        </View>

            <View style={[styles.staffCard, styles.marginTop]}>
              <View style={styles.staffInfo}>
                {routeDetails?.caretakerProfilePic ? (
            <Image 
              source={{ uri: routeDetails.caretakerProfilePic }} 
              style={styles.profilePic} 
            />
                ) : (
                  <View style={[styles.profilePicPlaceholder, styles.elevatedCard]}>
                    <MaterialIcons name="person" size={30} color="#FFF" />
                  </View>
                )}
                <View style={styles.staffDetails}>
                  <View style={styles.roleTag}>
                    <MaterialIcons name="supervisor-account" size={14} color="#2A2A72" />
                    <Text style={styles.staffRole}>Caretaker</Text>
                  </View>
                  <Text style={styles.staffName}>{routeDetails?.caretakerName || 'Not available'}</Text>
                  <View style={styles.phoneContainer}>
                    <MaterialIcons name="phone" size={14} color="#6B7280" />
                    <Text style={styles.staffPhone}>{routeDetails?.caretakerPhone || 'Not available'}</Text>
                  </View>
                </View>
          </View>
        </View>
      </View>

          {/* Student Selection Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Kid</Text>
            <View style={[styles.pickerContainer, selectedKidId ? styles.pickerContainerActive : null, styles.elevatedCard]}>
              <MaterialIcons name="person-outline" size={20} color="#2A2A72" style={styles.pickerIcon} />
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedKidId}
                  style={styles.picker}
                  onValueChange={async (itemValue) => {
                    setSelectedKidId(itemValue);
                    const kid = routeDetails?.students?.find(s => s.uuid === itemValue);
                    if (kid) {
                      setSelectedKid(kid);
                      setAttendanceData(prev => ({
                        ...prev,
                        userProfileUuid: kid.uuid
                      }));

                      // Fetch attendance for current day
                      try {
                        setIsLoadingAttendance(true);
                        const storedToken = await AsyncStorage.getItem('authToken');
                        
                        if (!storedToken) {
                          throw new Error('Authentication required');
                        }

                        const token = storedToken.startsWith('Bearer ') ? storedToken : `Bearer ${storedToken}`;
                        const currentDate = new Date();
                        const formattedDate = currentDate.toISOString().split('T')[0];
                        setSearchDate(currentDate);
                        
                        console.log('\nFetching attendance for:', {
                          kidName: kid.name,
                          kidUuid: kid.uuid,
                          date: formattedDate
                        });

                        const response = await axios.get(
                          `https://api.katsapp.com/api/v1/kid-attendance/${kid.uuid}/date/${formattedDate}`,
                          {
                            headers: {
                              'Authorization': token,
                              'Content-Type': 'application/json',
                              'Accept': 'application/json'
                            }
                          }
                        );

                        if (response.status === 200 && response.data) {
                          const attendanceData = response.data;
                          setAttendanceRecords([attendanceData]);
                          
                          // Log detailed attendance information
                          logAttendanceDetails(attendanceData);

                          // Update attendance status based on the most recent activity
                          const times = [
                            { type: 'Home Pickup', time: attendanceData.homePickup?.pickupTime },
                            { type: 'Home Drop', time: attendanceData.homeDrop?.dropTime },
                            { type: 'Institute Pickup', time: attendanceData.institutePickup?.pickupTime },
                            { type: 'Institute Drop', time: attendanceData.instituteDrop?.dropTime }
                          ].filter(item => item.time);

                          if (times.length > 0) {
                            times.sort((a, b) => new Date(b.time) - new Date(a.time));
                            const mostRecent = times[0];
                            
                            const statusUpdate = {
                              type: mostRecent.type,
                              time: formatTime(mostRecent.time),
                              date: formattedDate
                            };
                            setAttendanceStatus(prev => ({
                              ...prev,
                              [kid.uuid]: statusUpdate
                            }));
                          }
                        } else {
                          console.log('No attendance records found for today');
                          setAttendanceRecords([]);
                          setAttendanceStatus(prev => {
                            const newStatus = { ...prev };
                            delete newStatus[kid.uuid];
                            return newStatus;
                          });
                        }
                      } catch (error) {
                        // Silently handle 404 errors for no attendance records
                        if (error.response?.status === 404) {
                          console.log('No attendance records available for the selected date');
                          setAttendanceRecords([]);
                          setAttendanceStatus(prev => {
                            const newStatus = { ...prev };
                            delete newStatus[kid.uuid];
                            return newStatus;
                          });
                          return; // Exit without showing error alert
                        }
                        
                        console.error('Attendance fetch error:', {
                          message: error.message,
                          response: {
                            status: error.response?.status,
                            data: error.response?.data
                          }
                        });
                        
                        let errorMessage = 'Failed to fetch attendance records. ';
                        if (error.response?.status === 401) {
                          errorMessage += 'Please login again.';
                          AsyncStorage.multiRemove(['authToken', 'uuid'])
                            .then(() => navigation.navigate('Login'))
                            .catch(clearError => console.error('Failed to clear credentials:', clearError));
                        } else {
                          errorMessage += error.message || 'Please try again.';
                        }
                        
                        // Only show alert for non-404 errors
                        if (error.response?.status !== 404) {
                          Alert.alert('Error', errorMessage);
                        }
                      } finally {
                        setIsLoadingAttendance(false);
                      }
                    } else {
                      setSelectedKid(null);
                      setAttendanceRecords([]);
                      setAttendanceStatus({});
                      console.log('Kid selection cleared');
                    }
                  }}
                  dropdownIconColor="#FFFFFF"
                >
                  <Picker.Item label="-- Select a Kid --" value={null} color="#9CA3AF" style={{color: '#9CA3AF'}}/>
                  {(routeDetails?.students || []).map((student) => (
                    <Picker.Item 
                      key={student.uuid} 
                      label={`${student.name} (${student.gender})`} 
                      value={student.uuid} 
                      color="#111827"
                      style={{color: '#111827'}}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Selected Student Details */}
      {selectedKid && (
              <View style={[styles.selectedStudentCard, styles.elevatedCard]}>
                <View style={styles.studentHeader}>
                  <MaterialIcons name="school" size={24} color="#2A2A72" />
                  <Text style={styles.studentName}>{selectedKid.name}</Text>
                  {isLoadingAttendance ? (
                    <ActivityIndicator size="small" color="#2A2A72" style={styles.attendanceLoader} />
                  ) : (
                    attendanceStatus[selectedKid.uuid] && (
                      <View style={styles.attendanceTag}>
                        <MaterialIcons 
                          name={attendanceStatus[selectedKid.uuid].type === "Absent" ? "event-busy" : "check-circle"} 
                          size={16} 
                          color={attendanceStatus[selectedKid.uuid].type === "Absent" ? "#DC2626" : "#059669"} 
                        />
                        <Text style={[
                          styles.attendanceTagText,
                          { color: attendanceStatus[selectedKid.uuid].type === "Absent" ? "#DC2626" : "#059669" }
                        ]}>
                          {attendanceStatus[selectedKid.uuid].type === "Absent" ? "Absent" : "Present"}
                        </Text>
                        <Text style={styles.attendanceTime}>
                          {attendanceStatus[selectedKid.uuid].time}
                        </Text>
          </View>
                    )
                  )}
                </View>
                
                <View style={styles.studentDetails}>
                  {/* Gender and DOB Row */}
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <View style={styles.detailIcon}>
                        <MaterialIcons name="face" size={16} color="#2A2A72" />
                      </View>
                      <Text style={styles.detailText}>{selectedKid.gender}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <View style={styles.detailIcon}>
                        <MaterialIcons name="cake" size={16} color="#2A2A72" />
                      </View>
                      <Text style={styles.detailText}>{selectedKid.dob}</Text>
                    </View>
                  </View>
                  
                  {/* Date Picker Row */}
                  <View style={[styles.detailRow, styles.datePickerRow]}>
                    <TouchableOpacity 
                      style={styles.datePickerButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <View style={styles.detailIcon}>
                        <MaterialIcons name="calendar-today" size={16} color="#2A2A72" />
                      </View>
                      <Text style={styles.detailText}>
                        {searchDate.toLocaleDateString()}
                      </Text>
                      <MaterialIcons name="arrow-drop-down" size={24} color="#2A2A72" />
                    </TouchableOpacity>
                  </View>

                  {/* Attendance Records Section */}
                  {isLoadingAttendance ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#2A2A72" />
                      <Text style={styles.loadingText}>Loading attendance records...</Text>
                    </View>
                  ) : attendanceRecords && attendanceRecords.length > 0 && (
                    attendanceRecords[0].homePickup || 
                    attendanceRecords[0].homeDrop || 
                    attendanceRecords[0].institutePickup || 
                    attendanceRecords[0].instituteDrop
                  ) ? (
                    <View style={styles.attendanceRecordsContainer}>
                      <Text style={styles.attendanceDate}>
                        Attendance for {searchDate.toLocaleDateString()}
                      </Text>
                      
                      <View style={styles.timelineContainer}>
                        {/* Home Pickup */}
                        {attendanceRecords[0].homePickup && (
                          <View style={styles.timelineItem}>
                            <View style={styles.timelineLeft}>
                              <View style={[
                                styles.checkCircle,
                                { backgroundColor: attendanceRecords[0].homePickup.homeOnboard === "true" ? "#059669" : "#DC2626" }
                              ]}>
                                <MaterialIcons name="check" size={16} color="#FFFFFF" />
                              </View>
                              <View style={styles.timelineLine} />
                            </View>
                            <View style={styles.timelineContent}>
                              <View style={styles.timelineHeader}>
                                <Text style={styles.timelineTitle}>Home Pickup</Text>
                                <Text style={styles.timelineTime}>
                                  {formatTime(attendanceRecords[0].homePickup.pickupTime)}
                                </Text>
                              </View>
                              <Text style={[
                                styles.timelineStatus,
                                { color: attendanceRecords[0].homePickup.homeOnboard === "true" ? "#059669" : "#DC2626" }
                              ]}>
                                {attendanceRecords[0].homePickup.homeOnboard === "true" ? "Attended" : "Absent"}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Institute Drop */}
                        {attendanceRecords[0].instituteDrop && (
                          <View style={styles.timelineItem}>
                            <View style={styles.timelineLeft}>
                              <View style={[
                                styles.checkCircle,
                                { backgroundColor: attendanceRecords[0].instituteDrop.instituteOffboard === "true" ? "#059669" : "#DC2626" }
                              ]}>
                                <MaterialIcons name="check" size={16} color="#FFFFFF" />
                              </View>
                              <View style={styles.timelineLine} />
                            </View>
                            <View style={styles.timelineContent}>
                              <View style={styles.timelineHeader}>
                                <Text style={styles.timelineTitle}>Institute Drop</Text>
                                <Text style={styles.timelineTime}>
                                  {formatTime(attendanceRecords[0].instituteDrop.dropTime)}
                                </Text>
                              </View>
                              <Text style={[
                                styles.timelineStatus,
                                { color: attendanceRecords[0].instituteDrop.instituteOffboard === "true" ? "#059669" : "#DC2626" }
                              ]}>
                                {attendanceRecords[0].instituteDrop.instituteOffboard === "true" ? "Attended" : "Absent"}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Institute Pickup */}
                        {attendanceRecords[0].institutePickup && (
                          <View style={styles.timelineItem}>
                            <View style={styles.timelineLeft}>
                              <View style={[
                                styles.checkCircle,
                                { backgroundColor: attendanceRecords[0].institutePickup.instituteOnboard === "true" ? "#059669" : "#DC2626" }
                              ]}>
                                <MaterialIcons name="check" size={16} color="#FFFFFF" />
                              </View>
                              <View style={styles.timelineLine} />
                            </View>
                            <View style={styles.timelineContent}>
                              <View style={styles.timelineHeader}>
                                <Text style={styles.timelineTitle}>Institute Pickup</Text>
                                <Text style={styles.timelineTime}>
                                  {formatTime(attendanceRecords[0].institutePickup.pickupTime)}
                                </Text>
                              </View>
                              <Text style={[
                                styles.timelineStatus,
                                { color: attendanceRecords[0].institutePickup.instituteOnboard === "true" ? "#059669" : "#DC2626" }
                              ]}>
                                {attendanceRecords[0].institutePickup.instituteOnboard === "true" ? "Attended" : "Absent"}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Home Drop */}
                        {attendanceRecords[0].homeDrop && (
                          <View style={styles.timelineItem}>
                            <View style={styles.timelineLeft}>
                              <View style={[
                                styles.checkCircle,
                                { backgroundColor: attendanceRecords[0].homeDrop.homeOffboard === "true" ? "#059669" : "#DC2626" }
                              ]}>
                                <MaterialIcons name="check" size={16} color="#FFFFFF" />
                              </View>
                            </View>
                            <View style={styles.timelineContent}>
                              <View style={styles.timelineHeader}>
                                <Text style={styles.timelineTitle}>Home Drop</Text>
                                <Text style={styles.timelineTime}>
                                  {formatTime(attendanceRecords[0].homeDrop.dropTime)}
                                </Text>
                              </View>
                              <Text style={[
                                styles.timelineStatus,
                                { color: attendanceRecords[0].homeDrop.homeOffboard === "true" ? "#059669" : "#DC2626" }
                              ]}>
                                {attendanceRecords[0].homeDrop.homeOffboard === "true" ? "Attended" : "Absent"}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.noRecordsContainer}>
                      <MaterialIcons name="event-busy" size={24} color="#6B7280" />
                      <Text style={styles.noRecordsText}>
                        No attendance records found for {searchDate.toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={searchDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                )}
        </View>
      )}

      {selectedKidId && (
        <TouchableOpacity
                style={[styles.addButton, styles.elevatedCard]}
          onPress={handleAddAttendanceClick}
                activeOpacity={0.8}
        >
                <MaterialIcons name="add-circle-outline" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Add Attendance</Text>
        </TouchableOpacity>
      )}
          </View>
        </View>
      </ScrollView>

      {/* Attendance Modal */}
      <Modal visible={showAttendanceForm} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, styles.elevatedCard]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Attendance</Text>
              <TouchableOpacity 
                onPress={handleCancelAttendance} 
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Date</Text>
                <View style={[styles.inputContainer, styles.elevatedInput]}>
                  <MaterialIcons name="calendar-today" size={20} color="#2A2A72" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={attendanceData.date}
                    onChangeText={(text) => setAttendanceData({ ...attendanceData, date: text })}
                    placeholder="Select Date"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Type</Text>
                <View style={[styles.pickerContainer, styles.elevatedInput]}>
                  <MaterialIcons name="category" size={20} color="#2A2A72" style={styles.pickerIcon} />
                  <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={attendanceData.type}
                      style={styles.picker}
                      onValueChange={(itemValue) => setAttendanceData(prev => ({ ...prev, type: itemValue }))}
                      dropdownIconColor="#FFFFFF"
                    >
                      <Picker.Item label="-- Select Type --" value="" color="#9CA3AF" style={{color: '#9CA3AF'}}/>
                      <Picker.Item label="Home Pickup" value="Home Pickup" color="#111827" style={{color: '#111827'}}/>
                      <Picker.Item label="Home Drop" value="Home Drop" color="#111827" style={{color: '#111827'}}/>
                      <Picker.Item label="Institute Pickup" value="Institute Pickup" color="#111827" style={{color: '#111827'}}/>
                      <Picker.Item label="Institute Drop" value="Institute Drop" color="#111827" style={{color: '#111827'}}/>
                </Picker>
              </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Pickup Time</Text>
                <View style={[styles.inputContainer, styles.elevatedInput]}>
                  <MaterialIcons name="access-time" size={20} color="#2A2A72" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={attendanceData.pickupTime}
                    onChangeText={(text) => setAttendanceData({ ...attendanceData, pickupTime: text })}
                    placeholder="Enter Pickup Time"
                    placeholderTextColor="#9CA3AF"
              editable={false}
            />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Location</Text>
                <View style={[styles.inputContainer, styles.elevatedInput, !location && styles.disabledInput]}>
                  <MaterialIcons 
                    name="location-on" 
                    size={20} 
                    color={locationError ? "#DC2626" : "#2A2A72"} 
                    style={styles.inputIcon} 
                  />
                  {locationError ? (
                    <View style={styles.locationErrorContainer}>
                      <Text style={styles.locationErrorText}>{locationError}</Text>
                      <TouchableOpacity
                        style={styles.retryButton}
                        onPress={getLocation}
                      >
                        <Text style={styles.retryButtonText}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TextInput
                      style={[styles.input, !location && styles.disabledText]}
                      value={location ? `${attendanceData.latitude}, ${attendanceData.longitude}` : "Fetching location..."}
                      editable={false}
                      placeholder="Fetching location..."
                      placeholderTextColor="#9CA3AF"
                    />
                  )}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Photo</Text>
                <View style={styles.photoContainer}>
                  {attendanceData.image ? (
                    <View style={styles.photoPreviewContainer}>
                      <Image 
                        source={{ uri: attendanceData.image }} 
                        style={styles.photoPreview} 
                      />
              <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => setAttendanceData(prev => ({ ...prev, image: null }))}
              >
                        <MaterialIcons name="close" size={20} color="#FFF" />
              </TouchableOpacity>
                    </View>
                  ) : (
              <TouchableOpacity
                      style={[styles.cameraButton, styles.elevatedCard]}
                      onPress={handleTakePhoto}
                    >
                      <MaterialIcons name="camera-alt" size={24} color="#2A2A72" />
                      <Text style={styles.cameraButtonText}>Take Photo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.absentButton]}
                onPress={handleMarkAbsent}
                activeOpacity={0.8}
                disabled={submitting}
              >
                <MaterialIcons name="event-busy" size={20} color="#DC2626" />
                <Text style={styles.absentButtonText}>Mark as Absent</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton, 
                  styles.submitButton,
                  submitting && styles.buttonDisabled
                ]}
                onPress={handleAttendanceSubmit}
                activeOpacity={0.8}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={20} color="#FFF" />
                    <Text style={styles.submitButtonText}>Submit Attendance</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2A2A72" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2A2A72",
  },
  header: {
    backgroundColor: '#2A2A72',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  staffCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
  },
  elevatedCard: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffDetails: {
    flex: 1,
    marginLeft: 16,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  staffRole: {
    fontSize: 14,
    color: '#2A2A72',
    fontWeight: '600',
    marginLeft: 4,
  },
  staffName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  profilePic: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profilePicPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2A2A72',
    justifyContent: 'center',
    alignItems: 'center',
  },
  marginTop: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: '#111827',
    marginBottom: 16,
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    overflow: "hidden",
  },
  pickerContainerActive: {
    borderColor: "#2A2A72",
    backgroundColor: "#FFF",
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
    color: '#111827',
  },
  selectedStudentCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
    flex: 1,
  },
  studentDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  datePickerRow: {
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#EEF2FF',
    padding: 8,
    borderRadius: 8,
  },
  detailIcon: {
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 8,
    borderRadius: 8,
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "#2A2A72",
    padding: 16,
    borderRadius: 12,
  },
  addButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#F8F9FA",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '70%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: '#111827',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  modalScroll: {
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: '#374151',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  elevatedInput: {
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    fontSize: 16,
    color: '#111827',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
  },
  disabledText: {
    color: '#6B7280',
  },
  submitButton: {
    backgroundColor: "#2A2A72",
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoContainer: {
    marginTop: 8,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  cameraButtonText: {
    color: '#2A2A72',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  photoPreviewContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  absentButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  absentButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  attendanceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  attendanceTagText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  attendanceTime: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 6,
  },
  attendanceLoader: {
    marginLeft: 'auto',
  },
  attendanceRecordsContainer: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
  },
  attendanceDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2A2A72',
    marginBottom: 16,
  },
  timelineContainer: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 24,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    top: 24,
    width: 2,
    height: '100%',
    backgroundColor: '#E5E7EB',
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2A2A72',
  },
  timelineTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  timelineStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  noRecordsContainer: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  noRecordsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  locationErrorContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingRight: 12,
  },
  locationErrorText: {
    color: '#DC2626',
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  retryButton: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#2A2A72',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default RouteDetailsScreen;
