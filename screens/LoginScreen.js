import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Create refs for the input fields
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const handleResetPassword = () => {
    navigation.navigate('ResetPassword');
  };

  const handleLogin = async () => {
    // Trim the inputs
    const trimmedEmail = emailOrPhone.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert(
        'Validation Error', 
        'Please enter both Email/Phone and Password'
      );
      return;
    }

    setIsLoading(true);

    try {
      // Temporary mock data for testing
      const mockData = {
        token: 'mock-token-123',
        user: {
          uuid: '123456',
          name: 'Test User',
          email: trimmedEmail
        }
      };

      // For testing, always treat as successful
      if (mockData.token && mockData.user) {
        const data = mockData; // Use mock data
        try {
          // Store token with Bearer prefix
          const tokenWithBearer = `Bearer ${data.token}`;
          await AsyncStorage.setItem('authToken', tokenWithBearer);
          await AsyncStorage.setItem('uuid', data.user.uuid);
          
          console.log('Stored credentials:', {
            hasStoredToken: true,
            hasStoredUuid: true,
            storedUuid: data.user.uuid,
            tokenPrefix: 'Bearer ' + data.token.substring(0, 10) + '...'
          });

          // Navigate to Home screen
          navigation.replace('Home', { 
            user: data.user,
            token: tokenWithBearer 
          });
        } catch (storageError) {
          console.error('Storage Error:', storageError);
          Alert.alert('Error', 'Failed to save login credentials. Please try again.');
        }
      } else {
        Alert.alert(
          'Login Failed', 
          data.message || 'Invalid credentials. Please check your email/phone and password.'
        );
      }
    } catch (error) {
      console.error('Login Error:', error);
      Alert.alert(
        'Error', 
        'Unable to connect to the server. Please check your internet connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setEmailOrPhone('');
    setPassword('');
    emailInputRef.current?.focus();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <MaterialIcons name="school" size={40} color="#FFF" />
            </View>
            <Text style={styles.headerTitle}>KATS Caretaker</Text>
            <Text style={styles.headerSubtitle}>Welcome back! Please sign in to continue</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Email ID / Mobile No <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="person" size={20} color="#2A2A72" style={styles.inputIcon} />
                <TextInput
                  ref={emailInputRef}
                  style={styles.input}
                  placeholder="Enter your email or phone"
                  value={emailOrPhone}
                  onChangeText={setEmailOrPhone}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  blurOnSubmit={false}
                  placeholderTextColor="#666"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Password <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="lock" size={20} color="#2A2A72" style={styles.inputIcon} />
                <TextInput
                  ref={passwordInputRef}
                  style={styles.input}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  placeholderTextColor="#666"
                  editable={!isLoading}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  disabled={isLoading}
                >
                  <MaterialIcons 
                    name={showPassword ? 'visibility-off' : 'visibility'} 
                    size={20} 
                    color="#2A2A72" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.linksContainer}>
              <TouchableOpacity 
                onPress={() => navigation.navigate('ForgotPassword')}
                disabled={isLoading}
              >
                <Text style={styles.link}>Forgot Password?</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                <Text style={styles.link}>Reset Password?</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.clearButton} 
                onPress={handleClear}
                disabled={isLoading || (!emailOrPhone && !password)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="close" size={20} color="#666" />
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.loginButton,
                  (isLoading || !emailOrPhone || !password) && styles.loginButtonDisabled
                ]} 
                onPress={handleLogin}
                disabled={isLoading || !emailOrPhone || !password}
                activeOpacity={0.7}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <MaterialIcons name="login" size={20} color="#FFF" />
                    <Text style={styles.loginButtonText}>Login</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2A2A72',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingTop: 30,
    marginTop: 20,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2A2A72',
    marginBottom: 8,
  },
  required: {
    color: '#DC2626',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#2A2A72',
    height: 50,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2A2A72',
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 4,
  },
  link: {
    color: '#2A2A72',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    height: 48,
    borderRadius: 25,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clearButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  loginButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A72',
    height: 48,
    borderRadius: 25,
    gap: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
}); 