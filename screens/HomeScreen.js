import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

export default function HomeScreen({ navigation }) {
  const profile = {
    name: "Ravi Kumar",
    designation: "Driver",
    image: "https://i.pravatar.cc/150?img=8",
  };

  const handleCaretakerProfilePress = () => {
    navigation.navigate("My Routes");
  };

  const handleKidDetailsPress = () => {
    navigation.navigate("My Routes");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: 'white' }]}>
      <StatusBar barStyle="light-content" backgroundColor="white"/>
      
      {/* Header Section */}
      <View style={[styles.header, { backgroundColor: 'white' }]}>
        <View style={[styles.headerContent, { backgroundColor: 'white' }]}>
          <View style={[styles.logo, { height: 60, justifyContent: 'center', alignItems: 'center' }]}>
            <MaterialIcons name="school" size={40} color="#2A2A72" />
            <Text style={{ color: '#2A2A72', fontSize: 18, fontWeight: 'bold', marginTop: 5 }}>KATS</Text>
          </View>
        </View>
      </View>

      {/* Content Section */}
      <ScrollView style={[styles.content]} showsVerticalScrollIndicator={false}>
        <View style={styles.cardsContainer}>
          <TouchableOpacity
            style={styles.card}
            onPress={handleCaretakerProfilePress}
            activeOpacity={0.9}
          >
            <View style={styles.cardImageContainer}>
              <Image
                source={{
                  uri: "https://images.pexels.com/photos/8613086/pexels-photo-8613086.jpeg",
                }}
                style={styles.cardImage}
              />
              <View style={styles.cardOverlay} />
            </View>
            <View style={styles.cardContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="person" size={22} color="#2A2A72" />
                <Text style={styles.cardTitle}> CareTaker Profile</Text>
              </View>
              <Text style={styles.cardDescription}>View and manage your caretaker profile details</Text>
              <View style={styles.cardAction}>
                <Text style={styles.cardActionText}>View Profile</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#2A2A72" />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={handleKidDetailsPress}
            activeOpacity={0.9}
          >
            <View style={styles.cardImageContainer}>
              <Image
                source={{
                  uri: "https://images.pexels.com/photos/8926542/pexels-photo-8926542.jpeg",
                }}
                style={styles.cardImage}
              />
              <View style={styles.cardOverlay} />
            </View>
            <View style={styles.cardContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="child-care" size={22} color="#2A2A72" />
                <Text style={styles.cardTitle}> CareTaker Kid Details</Text>
                </View>
              <Text style={styles.cardDescription}>Access and manage children information</Text>
              <View style={styles.cardAction}>
                <Text style={styles.cardActionText}>View Details</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#2A2A72" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: "white",
    paddingBottom: 20,
  },
  headerContent: {
    padding: 20,
  },
  logo: {
    height: 40,
    width: "100%",
    marginBottom: 20,
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  profileInfo: {
    marginLeft: 12,
  },
  profileName: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
  },
  profileRole: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
  },
  content: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 80,
    ...Platform.select({
      ios: {
        shadowColor: '#2A2A72',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardsContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImageContainer: {
    height: 160,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(42, 42, 114, 0.1)",
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 8,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  cardAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  cardActionText: {
    color: "#2A2A72",
    fontSize: 14,
    fontWeight: "600",
  },
}); 