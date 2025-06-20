import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
  ScrollView,
  Platform,
  PermissionsAndroid
} from "react-native";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";

import { useRoute, useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import Ionicons from 'react-native-vector-icons/Ionicons';
import Geolocation from '@react-native-community/geolocation';

export default function KidDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { kidData } = route.params;

  const [photo, setPhoto] = useState(null);
  const [status, setStatus] = useState(null);
  const [date, setDate] = useState(new Date().toLocaleDateString());
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [location, setLocation] = useState(null);
  const [type, setType] = useState("Home Pickup");

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "KATS needs access to your location.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert("Permission needed", "Location access is required.");
        }
      }
    })();
  }, []);

  const getLocation = async () => {
    try {
      return new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setLocation({ latitude, longitude });
            resolve({ latitude, longitude });
          },
          (error) => {
            Alert.alert("Error", "Unable to fetch location.");
            reject(error);
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      });
    } catch (error) {
      Alert.alert("Error", "Unable to fetch location.");
    }
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Camera Permission",
            message: "KATS needs access to your camera.",
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
    }
    return true;
  };

  const markPresent = async (fromCamera = true) => {
    try {
      if (fromCamera) {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
          Alert.alert("Permission needed", "Camera permission is required.");
          return;
        }
      }

      const options = {
        mediaType: 'photo',
        quality: 0.7,
        saveToPhotos: false,
      };

      const result = fromCamera
        ? await launchCamera(options)
        : await launchImageLibrary(options);

      if (result.didCancel) {
        console.log('User cancelled image picker');
      } else if (result.errorCode) {
        console.log('ImagePicker Error:', result.errorMessage);
        Alert.alert("Error", "Failed to take/select photo. Please try again.");
      } else if (result.assets && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        setPhoto(photoUri);
        setStatus("Present");
        setDate(new Date().toLocaleDateString());
        setTime(new Date().toLocaleTimeString());
        await getLocation();
        Alert.alert("Marked Present", `${kidData.name} has been marked present.`);
      }
    } catch (error) {
      console.error('Camera/Gallery error:', error);
      Alert.alert("Error", "Failed to take/select photo. Please try again.");
    }
  };

  const markAbsent = () => {
    setPhoto(null);
    setStatus("Absent");
    setDate(new Date().toLocaleDateString());
    setTime(new Date().toLocaleTimeString());
    setLocation(null);
    Alert.alert("Marked Absent", `${kidData.name} has been marked absent.`);
  };

  const saveAndGoBack = () => {
    const updatedKidData = {
      ...kidData,
      status,
      photo,
      date,
      time,
      location,
      type,
    };
    navigation.goBack();
    route.params?.onUpdate?.(updatedKidData);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Kid Details</Text>
      <View style={styles.card}>
        <Text style={styles.name}>{kidData.name}</Text>
        <Text style={styles.label}>Pickup: <Text style={styles.value}>{kidData.pickup}</Text></Text>
        <Text style={styles.label}>Drop: <Text style={styles.value}>{kidData.drop}</Text></Text>

        {photo && <Image source={{ uri: photo }} style={styles.photo} />}

        <Text style={styles.label}>Date: <Text style={styles.value}>{date}</Text></Text>
        <Text style={styles.label}>Time: <Text style={styles.value}>{time}</Text></Text>

        <View style={styles.geoRow}>
          <Text style={styles.geoText}>
            Location: {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : "Not set"}
          </Text>
          <TouchableOpacity onPress={getLocation} style={styles.refreshButton}>
            <Text style={styles.refreshIcon}>⟳</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Type:</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={type}
            onValueChange={(itemValue) => setType(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Home Pickup" value="Home Pickup" />
            <Picker.Item label="Institute Pickup" value="Institute Pickup" />
            <Picker.Item label="Home Drop" value="Home Drop" />
            <Picker.Item label="Institute Drop" value="Institute Drop" />
          </Picker>
        </View>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity onPress={() => markPresent(true)} style={styles.buttonPrimary}>
          <Text style={styles.buttonText}>Mark Present (Capture)</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => markPresent(false)} style={styles.buttonSecondary}>
          <Text style={styles.buttonText}>Mark Present (Upload)</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={markAbsent} style={styles.buttonDanger}>
          <Text style={styles.buttonText}>Mark Absent</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={saveAndGoBack} style={styles.buttonSuccess}>
          <Text style={styles.buttonText}>Save & Go Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#FAFAFA",
    flexGrow: 1,
  },
  heading: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#2C3E50",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 30,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
    color: "#34495E",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    color: "#566573",
  },
  value: {
    fontWeight: "400",
    color: "#626567",
  },
  geoRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 8,
  },
  geoText: {
    color: "#2C3E50",
    fontWeight: "500",
    fontSize: 15,
    marginRight: 8,
  },
  refreshButton: {
    backgroundColor: "#007BFF",
    padding: 6,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshIcon: {
    color: "#FFF",
    fontSize: 14,
  },
  inputContainer: {
    backgroundColor: "#FDFEFE",
    borderColor: "#D0D3D4",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    marginTop: 10,
    fontSize: 16,
    color: "#2C3E50",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#D5DBDB",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 10,
    backgroundColor: "#F4F6F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  picker: {
    height: 44,
    paddingHorizontal: 10,
    color: "#2C3E50",
  },
  buttonsContainer: {
    alignItems: "center",
  },
  buttonPrimary: {
    backgroundColor: "#2980B9",
    paddingVertical: 15,
    borderRadius: 12,
    width: "90%",
    marginVertical: 8,
  },
  buttonSecondary: {
    backgroundColor: "#3498DB",
    paddingVertical: 15,
    borderRadius: 12,
    width: "90%",
    marginVertical: 8,
  },
  buttonDanger: {
    backgroundColor: "#E74C3C",
    paddingVertical: 15,
    borderRadius: 12,
    width: "90%",
    marginVertical: 8,
  },
  buttonSuccess: {
    backgroundColor: "#27AE60",
    paddingVertical: 15,
    borderRadius: 12,
    width: "90%",
    marginVertical: 8,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
