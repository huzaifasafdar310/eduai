import { GlobalHeader } from '@/components/GlobalHeader';
import { RichTextRenderer } from '@/components/RichTextRenderer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { COLORS } from '@/hooks/use-app-theme';
import { getAcademicStudioAI, searchWeb } from '@/utils/api';
import { supabase } from '@/utils/supabase';
import { moderateScale, scale, verticalScale } from '@/utils/responsive';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Katex from 'react-native-katex';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const STUDIO_ACTIONS = [
  { id: 'math', label: 'MATH SOLVER', icon: 'calculator', color: '#10B981' },
  { id: 'writer', label: 'ESSAY WRITER', icon: 'document-text', color: '#F59E0B' },
  { id: 'quiz', label: 'QUIZ GENESIS', icon: 'help-circle', color: '#8B5CF6' },
  { id: 'grammar', label: 'GRAMMAR', icon: 'language', color: '#6366F1' },
  { id: 'summarizer', label: 'SUMMARIZER', icon: 'library', color: '#EC4899' },
];

const AI_AGENTS = [
  { id: 'researcher', name: 'Research AI', icon: 'shield-search', color: '#10B981', desc: 'Fact checking & citations' },
  { id: 'coder', name: 'Code Buddy', icon: 'code-braces', color: '#3B82F6', desc: 'Debug & snippets' },
  { id: 'analyst', name: 'Data Analyst', icon: 'chart-arc', color: '#8B5CF6', desc: 'Insights & patterns' },
  { id: 'creative', name: 'Creative Muse', icon: 'palette-swatch', color: '#EC4899', desc: 'Ideas & storytelling' },
];

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const { theme: themeName, isDark } = useTheme();
  const theme = COLORS[themeName];
  const { t } = useLanguage();
  const router = useRouter();

  const floatAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);
  const studioRef = useRef<ScrollView>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const [aiResponse, setAiResponse] = useState<any>(null);
  const pageOpacity = useSharedValue(0);

  useEffect(() => {
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(-16, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 1200, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 1200, easing: Easing.in(Easing.quad) })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    if (resultVisible) {
      pageOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
    } else {
      pageOpacity.value = withTiming(0, { duration: 400 });
    }
  }, [resultVisible]);

  const handleAICommand = async () => {
    if (!command.trim()) return;
    setAiResponse(null);
    setResultVisible(true);
    setLoading(true);
    try {
      const webResults = await searchWeb(command);
      let summaryText = "";
      if (webResults && webResults.length > 0) {
        const context = webResults.map((r: any) => `Source: ${r.title}\nContent: ${r.content}`).join('\n\n');
        const systemPrompt = "Break down the research into logical segments using **[STEP]** only if beneficial. Highlight critical findings in [HIGHLIGHT] and visualize structure with [DIAGRAM] where appropriate.";
        summaryText = await getAcademicStudioAI(`${systemPrompt} Explain this clearly using these web results: ${command}`, context, "text/plain");
      } else {
        summaryText = await getAcademicStudioAI(`${command}. Organize with **[STEP]** and [HIGHLIGHT] naturally if helpful.`);
      }
      setAiResponse(summaryText);
      
      // 💾 CLOUD SYNC FOR MULTI-DEVICE (Phase 2)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('documents').insert({
          user_id: user.id,
          title: `Research: ${command.substring(0, 25)}...`,
          content: summaryText,
          file_type: 'AI Research Insight',
          created_at: new Date().toISOString()
        });
      }
      
      setCommand('');
    } catch (e) {
      console.error("Dashboard Search Error:", e);
      setAiResponse("I encountered an issue. Let's try again!");
    } finally {
      setLoading(false);
    }
  };

  const animatedHeroStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { translateY: floatAnim.value }, { rotateX: '1deg' }, { rotateY: '-3deg' }],
  }));

  const PremiumLogo = ({ icon, color }: any) => (
    <View style={logoStyles.container}>
      <LinearGradient colors={[color + '50', color + '20']} style={[logoStyles.ring, { borderColor: color + '40', borderWidth: 1.5 }]} />
      <View style={[logoStyles.logoBackground, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.3)' : 'rgba(255,255,255,0.7)' }]}>
        <Ionicons name={icon} size={moderateScale(22)} color={color} />
      </View>
    </View>
  );

  const QuickTool = ({ id, icon, label, color }: any) => (
    <View style={styles.actionMain}>
      <TouchableOpacity activeOpacity={0.6} style={styles.glassBtn} onPress={() => router.push({ pathname: '/tool/[id]', params: { id } })}>
        <PremiumLogo icon={icon} color={color} />
        <ThemedText style={[styles.gridMiniText, { color: theme.text }]} numberOfLines={2}>{label}</ThemedText>
      </TouchableOpacity>
    </View>
  );

  const AgentItem = ({ item }: any) => (
    <TouchableOpacity activeOpacity={0.85} style={[styles.agentCard, { borderColor: theme.border, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FFF' }]}>
      <View style={[styles.agentIconBox, { backgroundColor: item.color + '20' }]}>
        <MaterialCommunityIcons name={item.icon} size={moderateScale(24)} color={item.color} />
      </View>
      <View style={styles.agentInfo}>
        <ThemedText style={[styles.agentName, { color: theme.text }]}>{item.name}</ThemedText>
        <ThemedText style={[styles.agentDesc, { color: theme.gray }]}>{item.desc}</ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.gray} style={{ opacity: 0.5 }} />
    </TouchableOpacity>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top, backgroundColor: isDark ? '#020617' : '#F1F5F9' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <GlobalHeader />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.bgPattern} />

        <Animated.View entering={FadeInDown.delay(200).duration(800)} style={styles.searchSection}>
          <View style={[styles.searchBarContainer, { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : '#FFFFFF', borderColor: isDark ? 'rgba(59,130,246,0.3)' : '#E2E8F0' }]}>
            <LinearGradient colors={['#3B82F6', '#6366F1']} style={styles.searchIconOrb}>
              <Ionicons name="search" size={16} color="#FFF" />
            </LinearGradient>
            <TextInput
              placeholder={'Ask your academic assistant...'}
              placeholderTextColor={theme.gray}
              style={[styles.searchInput, { color: theme.text }]}
              value={command}
              onChangeText={setCommand}
              onSubmitEditing={handleAICommand}
            />
            {loading ? (
              <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 10 }} />
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsRecording(!isRecording)}
                style={[styles.micBtnPremium, { backgroundColor: isRecording ? '#EF4444' : (isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)') }]}
              >
                <Ionicons name={isRecording ? "stop" : "mic"} size={20} color={isRecording ? "#FFF" : "#3B82F6"} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        <View style={styles.heroContainer}>
          <Animated.View style={[styles.threeDCard, animatedHeroStyle, { shadowColor: '#3B82F6', shadowOpacity: isDark ? 0.5 : 0.25, shadowRadius: 35, elevation: 18 }]}>
            <LinearGradient colors={isDark ? ['#1E293B', '#0F172A', '#020617'] : ['#2563EB', '#1D4ED8', '#1E3A8A']} style={styles.cardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent']} style={styles.textVignette} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 0 }} />
              <View style={[styles.particle, { top: 20, left: '60%', width: 6, height: 6, opacity: 0.2 }]} />
              <View style={[styles.particle, { top: 60, left: '85%', width: 4, height: 4, opacity: 0.3 }]} />
              <View style={[styles.particle, { bottom: 30, left: '40%', width: 8, height: 8, opacity: 0.1 }]} />
              <LinearGradient colors={['rgba(255,255,255,0.08)', 'transparent']} style={styles.heroAuraMesh} />

              <View style={styles.cardContent}>
                <View style={styles.cardTextCol}>
                  <View style={styles.hubBadgeHighContrast}>
                    <Ionicons name="flash" size={10} color="#FFF" />
                    <ThemedText style={styles.hubBadgeTextHighContrast}>STUDIO ELITE</ThemedText>
                  </View>
                  <ThemedText style={styles.cardTitlePremiumShadow} numberOfLines={2}>Your Academic Superpowers</ThemedText>
                  <TouchableOpacity style={styles.ctaBtnDiscovery} activeOpacity={0.9}>
                    <ThemedText style={styles.ctaTextPremium}>ACTIVATE STUDIO</ThemedText>
                    <Ionicons name="chevron-forward-circle" size={18} color="#FFF" style={{ marginLeft: 10 }} />
                  </TouchableOpacity>
                </View>
                <View style={styles.heroImgWrapper}>
                   <Animated.Image 
                     source={require('../../assets/images/onboarding_blue.png')} 
                     style={[illustrationBoxStyles.heroImage, { transform: [{ perspective: 1000 }, { rotateY: '-8deg' }]}]} 
                     resizeMode="contain" 
                   />
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.sectionContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: verticalScale(15) }}>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>ACADEMIC STUDIO</ThemedText>
            <TouchableOpacity onPress={() => studioRef.current?.scrollTo({ x: 300, animated: true })} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', opacity: 0.8 }}>
              <ThemedText style={{ fontSize: moderateScale(10), color: theme.primary, fontWeight: '800' }}>SWIPE</ThemedText>
              <Ionicons name="chevron-forward" size={moderateScale(14)} color={theme.primary} style={{ marginLeft: scale(4) }} />
            </TouchableOpacity>
          </View>
          <ScrollView ref={studioRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: moderateScale(15), alignItems: 'center' }}>
            {STUDIO_ACTIONS.map(tool => (
              <QuickTool key={tool.id} id={tool.id} icon={tool.icon} label={tool.label} color={tool.color} />
            ))}
          </ScrollView>
        </Animated.View>

        <View style={styles.footer}>
          <ThemedText style={[styles.footerText, { color: theme.gray }]}>Powered by <ThemedText style={{ color: theme.primary, fontWeight: '800' }}>Devnexes digital solution</ThemedText></ThemedText>
        </View>
      </ScrollView>

      <Animated.View
        pointerEvents={resultVisible ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, styles.visualPageLayer, { opacity: pageOpacity }]}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#020617' : '#FFFFFF' }]}>
          <LinearGradient colors={['#3B82F640', 'transparent', '#3B82F610']} style={StyleSheet.absoluteFill} />
          <View style={styles.vpGlowOrb} />
        </View>

        <View style={{ paddingTop: insets.top + 20, flex: 1 }}>
          <View style={styles.vpHeader}>
            <TouchableOpacity onPress={() => setResultVisible(false)} activeOpacity={0.7} style={styles.vpBackBtn}>
              <Ionicons name="chevron-back" size={24} color="#3B82F6" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.vpBadge}>EDUAi RESEARCH PORTAL</ThemedText>
              <ThemedText style={[styles.vpTitle, { color: theme.text }]}>Intelligence Discovery</ThemedText>
            </View>
            <View style={styles.vpHeaderIcon}>
              <MaterialCommunityIcons name="molecule" size={28} color="#3B82F6" />
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 150 }}>
            {loading && !aiResponse ? (
              <View style={styles.pulseContainer}>
                <Animated.View style={[styles.neuralPulse, { transform: [{ scale: pulseAnim }], opacity: 0.2 }]} />
                <Animated.View style={[styles.neuralPulseInner, { transform: [{ scale: pulseAnim }], opacity: 0.4 }]} />
                <View style={styles.pulseCenterOrb}>
                  <MaterialCommunityIcons name="brain" size={40} color="#3B82F6" />
                </View>
                <ThemedText style={styles.pulseText}>SYNTHESIZING ACADEMIC INSIGHTS...</ThemedText>
              </View>
            ) : (
              <>
                <View style={[styles.visualResultBox, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#FFF' }]}>
                  <RichTextRenderer 
                    content={aiResponse} 
                    highlightColor="#3B82F6" 
                    textColor={isDark ? '#FFFFFF' : '#0F172A'}
                    isDark={isDark}
                  />
                </View>

                <TouchableOpacity
                  onPress={() => setResultVisible(false)}
                  style={styles.vpCloseBtn}
                  activeOpacity={0.8}
                >
                  <ThemedText style={styles.vpCloseBtnText}>DISMISS DISCOVERY</ThemedText>
                  <Ionicons name="sparkles" size={18} color="#FFF" style={{ marginLeft: 12 }} />
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Animated.View>
    </ThemedView>
  );
}

const mathStyles = StyleSheet.create({});

const logoStyles = StyleSheet.create({
  container: { width: moderateScale(44), height: moderateScale(44), justifyContent: 'center', alignItems: 'center', marginBottom: verticalScale(8) },
  ring: { position: 'absolute', width: moderateScale(44), height: moderateScale(44), borderRadius: moderateScale(16) },
  logoBackground: { width: moderateScale(34), height: moderateScale(34), borderRadius: moderateScale(12), justifyContent: 'center', alignItems: 'center' },
});

const illustrationBoxStyles = StyleSheet.create({
  illustrationBox: { flex: 0.42, height: '100%', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  heroImage: { width: moderateScale(160), height: moderateScale(160), zIndex: 10 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: verticalScale(150), zIndex: 10 },
  bgPattern: { position: 'absolute', top: 0, left: 0, right: 0, height: 500, opacity: 0.03, zIndex: -1 },
  searchSection: { paddingHorizontal: scale(15), marginTop: 10, marginBottom: 15 },
  searchBarContainer: { height: 60, borderRadius: 16, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.05)', elevation: 3 },
  searchIconOrb: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600' },
  micBtnPremium: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  heroContainer: { height: 210, paddingHorizontal: 15, justifyContent: 'center', marginTop: 10 },
  threeDCard: { height: 200, borderRadius: 20, overflow: 'hidden' },
  cardGradient: { flex: 1, padding: 25, position: 'relative' },
  textVignette: { position: 'absolute', top: 0, left: 0, bottom: 0, width: '80%', zIndex: 1, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
  heroAuraMesh: { position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100 },
  particle: { position: 'absolute', backgroundColor: '#FFF', borderRadius: 6 },
  cardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1, zIndex: 5 },
  cardTextCol: { flex: 0.55, zIndex: 10 },
  heroImgWrapper: { flex: 0.45, alignItems: 'center', justifyContent: 'center' },
  hubBadgeHighContrast: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E3A8A', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, marginBottom: 15, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  hubBadgeTextHighContrast: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginLeft: 8 },
  cardTitlePremiumShadow: { fontSize: 28, fontWeight: '900', color: '#FFF', lineHeight: 32, marginBottom: 20, letterSpacing: -0.5, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  ctaBtnDiscovery: { backgroundColor: '#3B82F6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', boxShadow: '0px 10px 20px rgba(59, 130, 246, 0.4)', elevation: 6 },
  ctaTextPremium: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1.2 },
  sectionContainer: { marginTop: 25, paddingHorizontal: 15 },
  sectionTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  actionMain: { width: 100, marginBottom: 10, marginHorizontal: 8, alignItems: 'center' },
  glassBtn: { width: '100%', height: 100, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingVertical: 15, backgroundColor: 'transparent' },
  gridMiniText: { fontSize: 10, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5, marginTop: 10 },
  agentCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 18, borderWidth: 1 },
  agentIconBox: { width: moderateScale(45), height: moderateScale(45), borderRadius: moderateScale(12), justifyContent: 'center', alignItems: 'center' },
  agentInfo: { flex: 1, marginLeft: scale(12) },
  agentName: { fontSize: moderateScale(14), fontWeight: '800' },
  agentDesc: { fontSize: moderateScale(11), marginTop: 2, opacity: 0.7 },
  footer: { marginTop: verticalScale(40), marginBottom: verticalScale(30), alignItems: 'center' },
  footerText: { fontSize: moderateScale(11), fontWeight: '600', letterSpacing: 0.8 },
  visualPageLayer: { zIndex: 9999 },
  vpGlowOrb: { position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: '#3B82F6', opacity: 0.05 },
  vpHeader: { paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  vpBackBtn: { width: 50, height: 50, borderRadius: 18, backgroundColor: 'rgba(59,130,246,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 20, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' },
  vpHeaderIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: 'rgba(59,130,246,0.08)', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  vpBadge: { fontSize: 10, fontWeight: '900', color: '#3B82F6', letterSpacing: 3 },
  vpTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  visualResultBox: { padding: 30, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)', boxShadow: '0px 10px 30px rgba(59, 130, 246, 0.1)', elevation: 8, overflow: 'hidden' },
  vpCloseBtn: { marginTop: 40, height: 70, borderRadius: 20, backgroundColor: '#3B82F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', boxShadow: '0px 10px 20px rgba(59, 130, 246, 0.6)', elevation: 15 },
  vpCloseBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  pulseContainer: { height: 400, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  neuralPulse: { position: 'absolute', width: 250, height: 250, borderRadius: 125, borderWidth: 2, borderColor: '#3B82F6' },
  neuralPulseInner: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(59,130,246,0.1)' },
  pulseCenterOrb: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(59,130,246,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#3B82F6' },
  pulseText: { marginTop: 60, fontSize: 11, fontWeight: '900', color: '#3B82F6', letterSpacing: 2.5, opacity: 0.7, textAlign: 'center' }
});
