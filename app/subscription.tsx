import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, StatusBar, Dimensions, Image, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/context/ThemeContext';
import { COLORS } from '@/hooks/use-app-theme';

const { width } = Dimensions.get('window');

const PREMIUM_FEATURES = [
  { id: 1, title: 'Unlimited AI Studio Access', desc: 'Process unlimited Math, Essays, and Summaries.', icon: 'infinity', color: '#10B981' },
  { id: 2, title: 'Real-time Cross-Device Sync', desc: 'Access your documents and reminders anywhere.', icon: 'sync', color: '#3B82F6' },
  { id: 3, title: 'No Advertisements', desc: 'Focus on your studies without any interruptions.', icon: 'block-helper', color: '#EF4444' },
  { id: 4, title: 'Advanced AI Notes & Academic Plus', desc: 'Unlock high-fidelity AI-driven academic writing.', icon: 'file-star-outline', color: '#F59E0B' },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: themeName, isDark } = useTheme();
  const theme = COLORS[themeName];
  
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const plans = [
    { 
      id: 'yearly', 
      name: 'Yearly Standard', 
      price: '$49.99', 
      period: '/yr', 
      savings: 'Save 40%', 
      isPopular: true,
      desc: 'Most economical for active students'
    },
    { 
      id: 'monthly', 
      name: 'Monthly Basic', 
      price: '$6.99', 
      period: '/mo', 
      savings: null, 
      isPopular: false,
      desc: 'Flexibility for short-term projects'
    }
  ];

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
        
        {/* TOP HERO */}
        <LinearGradient colors={['#3B82F6', '#1E40AF']} style={[styles.hero, { paddingTop: insets.top + 20 }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.badgeContainer}>
             <MaterialCommunityIcons name="star-circle" size={30} color="#FFD700" />
             <ThemedText style={styles.badgeText}>EDU+ PREMIUM</ThemedText>
          </View>
          <ThemedText style={styles.heroTitle}>Academic Mastery.{"\n"}Unlocked.</ThemedText>
          <ThemedText style={styles.heroSubtitle}>Choose a plan that fits your academic goals.</ThemedText>
        </LinearGradient>

        <View style={styles.content}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>What's included in Plus?</ThemedText>
          
          <View style={styles.featureGrid}>
            {PREMIUM_FEATURES.map(feat => (
              <View key={feat.id} style={styles.featureItem}>
                <View style={[styles.iconBox, { backgroundColor: feat.color + '15' }]}>
                  <MaterialCommunityIcons name={feat.icon as any} size={24} color={feat.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.featureTitle, { color: theme.text }]}>{feat.title}</ThemedText>
                  <ThemedText style={[styles.featureDesc, { color: theme.gray }]}>{feat.desc}</ThemedText>
                </View>
              </View>
            ))}
          </View>

          <ThemedText style={[styles.sectionTitle, { color: theme.text, marginTop: 40, marginBottom: 20 }]}>Selected Plan</ThemedText>

          {/* INTERACTIVE PLAN CARDS */}
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <TouchableOpacity 
                key={plan.id}
                activeOpacity={0.8}
                onPress={() => setSelectedPlan(plan.id as any)}
                style={[
                  styles.planCard, 
                  { 
                    backgroundColor: isSelected ? (isDark ? '#1E293B' : '#EFF6FF') : (isDark ? '#0F172A' : '#F8FAFC'),
                    borderColor: isSelected ? '#3B82F6' : theme.border,
                    borderWidth: isSelected ? 2.5 : 1.5
                  }
                ]}
              >
                {plan.isPopular && <View style={styles.popularBadge}><ThemedText style={styles.popularText}>BEST VALUE</ThemedText></View>}
                
                <View style={styles.planHeader}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.planPeriod, { color: theme.text }]}>{plan.name}</ThemedText>
                    <ThemedText style={[styles.planDesc, { color: theme.gray }]}>{plan.desc}</ThemedText>
                  </View>
                  <View style={[styles.radio, { borderColor: isSelected ? '#3B82F6' : theme.gray }]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </View>

                <View style={styles.priceRow}>
                  <ThemedText style={[styles.planPrice, { color: theme.text }]}>
                    {plan.price}<ThemedText style={{ fontSize: 16 }}>{plan.period}</ThemedText>
                  </ThemedText>
                  {plan.savings && (
                    <View style={styles.savingsTag}>
                       <ThemedText style={styles.savingsText}>{plan.savings} OFF</ThemedText>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.buyBtn} activeOpacity={0.85}>
            <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.buyBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
               <ThemedText style={styles.buyText}>Continue with {selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}</ThemedText>
               <Ionicons name="shield-checkmark" size={20} color="#FFF" style={{ marginLeft: 10 }} />
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ alignItems: 'center', marginTop: 25, paddingBottom: 80 }}>
             <ThemedText style={{ color: theme.gray, fontSize: 11, textAlign: 'center' }}>
               7-day money back guarantee. Cancel anytime. Safe and Secure Checkout.
             </ThemedText>
          </View>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollPadding: { paddingBottom: 50 },
  hero: { paddingHorizontal: 25, paddingBottom: 40, borderBottomLeftRadius: 50, borderBottomRightRadius: 50 },
  backBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  badgeText: { color: '#FFD700', fontSize: 14, fontWeight: '900', marginLeft: 8, letterSpacing: 1 },
  heroTitle: { color: '#FFF', fontSize: 32, fontWeight: '900', lineHeight: 40 },
  heroSubtitle: { color: '#FFF', fontSize: 15, opacity: 0.85, marginTop: 12 },
  
  content: { paddingHorizontal: 25, paddingTop: 30 },
  sectionTitle: { fontSize: 20, fontWeight: '900', marginBottom: 20 },
  featureGrid: { gap: 15 },
  featureItem: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 18 },
  featureTitle: { fontSize: 15, fontWeight: '800' },
  featureDesc: { fontSize: 11, fontWeight: '600', marginTop: 2, lineHeight: 16 },

  planCard: { padding: 22, borderRadius: 32, marginBottom: 12, position: 'relative', elevation: 2 },
  planHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  planPeriod: { fontSize: 18, fontWeight: '900' },
  planDesc: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3B82F6' },
  
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15 },
  planPrice: { fontSize: 28, fontWeight: '900' },
  
  popularBadge: { position: 'absolute', top: -10, right: 25, backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, elevation: 4 },
  popularText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  
  savingsTag: { backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  savingsText: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  buyBtn: { height: 75, marginTop: 40, borderRadius: 24, overflow: 'hidden', elevation: 12, shadowColor: '#3B82F6', shadowOpacity: 0.4, shadowRadius: 15 },
  buyBtnGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  buyText: { color: '#FFF', fontSize: 18, fontWeight: '900' }
});
