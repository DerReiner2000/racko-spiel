import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand, colors, styles } from "@/components/game-ui";

export default function HomeScreen() {
  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.setupPage}>
      <Brand subtitle="DEINE SPIELRUNDE" />
      <LinearGradient colors={[colors.green, colors.green2]} style={styles.hero}>
        <Text style={styles.eyebrowGold}>KARTEN. TAKTIK. RACK’O.</Text>
        <Text style={styles.heroTitle}>Deine Runde.{"\n"}<Text style={styles.heroAccent}>Überall dabei.</Text></Text>
        <Text style={styles.heroCopy}>Spiele online mit Freunden im Browser oder in der App. Oder reicht ein Handy weiter und spielt ganz ohne Internet.</Text>
      </LinearGradient>
      <Link href="./online" asChild><Pressable accessibilityRole="button" style={styles.primaryButton}><Text style={styles.primaryButtonText}>Online spielen</Text></Pressable></Link>
      <View style={styles.panel}><Text style={styles.panelTitle}>An einem Gerät</Text><Text style={styles.hint}>2–4 Personen · Sichtschutz beim Weiterreichen · Spielstand bleibt auf diesem Gerät.</Text>
        <Link href="./local" asChild><Pressable style={[styles.continueButton, { marginTop: 18 }]}><Text style={styles.continueText}>Lokal spielen</Text></Pressable></Link>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
