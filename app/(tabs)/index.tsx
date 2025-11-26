import { StyleSheet, TouchableOpacity } from 'react-native';

import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';

import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function TabOneScreen() {
  const onLogout = async () => {
    try {
      await signOut(auth);
      // Automatically redirects to /auth/login because of onAuthStateChanged
    } catch (err) {
      console.log("Logout error:", err);
    }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tab One</Text>
      <TouchableOpacity
        onPress={onLogout}
        style={{
          backgroundColor: "#e53935",
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});
