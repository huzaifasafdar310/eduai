import { GlobalHeader } from '@/components/GlobalHeader';
import { RichTextRenderer } from '@/components/RichTextRenderer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { COLORS } from '@/hooks/use-app-theme';
import { supabase } from '@/utils/supabase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { theme: themeName, isDark } = useTheme();
  const theme = COLORS[themeName];
  const { t } = useLanguage();

  const FILTERS = [
    { id: 'all', label: t('all'), icon: 'grid-outline' },
    { id: 'math', label: 'Math Solver', icon: 'calculator', color: '#10B981' },
    { id: 'summarizer', label: 'Summarizer', icon: 'library', color: '#EC4899' },
    { id: 'writer', label: 'Essay Writer', icon: 'document-text', color: '#F59E0B' },
    { id: 'grammar', label: 'Grammar', icon: 'language', color: '#6366F1' },
    { id: 'reminder', label: 'Reminders', icon: 'alarm', color: '#3B82F6' },
  ];

  const [activeFilter, setActiveFilter] = useState('all');
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: docs } = await supabase.from('documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      const { data: reminders } = await supabase.from('homework_reminders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

      const unified: any[] = [];
      
      if (docs) {
        docs.forEach((doc: any) => {
          let type = 'writer';
          const title = doc.title.toLowerCase();
          
          if (title.includes('summary')) type = 'summarizer';
          else if (title.includes('math')) type = 'math';
          else if (title.includes('grammar')) type = 'grammar';

          const toolConfig = FILTERS.find(f => f.id === type) || { color: '#6366F1', icon: 'document-text' };

          unified.push({
            id: doc.id,
            title: doc.title,
            subTitle: doc.content ? doc.content.substring(0, 80) + '...' : 'AI Academic Insight',
            content: doc.content,
            status: 'Elite Access',
            time: new Date(doc.created_at),
            type: type,
            icon: (toolConfig as any).icon,
            color: (toolConfig as any).color || '#6366F1'
          });
        });
      }

      if (reminders) {
        reminders.forEach((rem: any) => {
          unified.push({
            id: rem.id,
            title: rem.book_name,
            subTitle: rem.task_description,
            status: rem.status,
            time: new Date(rem.created_at),
            type: 'reminder',
            icon: 'alarm',
            color: '#3B82F6'
          });
        });
      }

      unified.sort((a, b) => b.time.getTime() - a.time.getTime());
      setActivities(unified);
    } catch (e) {
      console.log('[HISTORY_FETCH_ERROR]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const deleteItem = async (item: any) => {
    Alert.alert(
      "Remove Discovery?",
      "Once deleted, this academic insight cannot be recovered.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            const table = item.type === 'reminder' ? 'homework_reminders' : 'documents';
            const { error } = await supabase.from(table).delete().eq('id', item.id);
            if (!error) fetchHistory();
          }
        }
      ]
    );
  };

  useFocusEffect(useCallback(() => {
    fetchHistory();
  }, []));

  const filteredData = activities.filter(item => {
    if (activeFilter === 'all') return true;
    return item.type === activeFilter;
  });

  const ActivityCard = ({ item }: { item: any }) => (
    <Animated.View entering={FadeInDown.duration(600)}>
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={() => {
          if (item.content) {
            setSelectedDoc(item);
            setModalVisible(true);
          }
        }}
        style={[styles.card, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0' }]}
      >
        <LinearGradient colors={[item.color + '15', 'transparent']} style={styles.cardGlow} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        
        <View style={styles.cardHeader}>
          <View style={styles.typeRow}>
            <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }]}>
               <Ionicons name={item.icon as any} size={14} color={item.color} />
            </View>
            <ThemedText style={[styles.typeLabel, { color: item.color }]}>{item.type.toUpperCase()}</ThemedText>
          </View>
          <TouchableOpacity onPress={() => deleteItem(item)} style={styles.trashCircle}>
             <Ionicons name="close-circle-outline" size={20} color="#EF4444" style={{ opacity: 0.6 }} />
          </TouchableOpacity>
        </View>

        <ThemedText style={[styles.cardTitle, { color: theme.text }]}>{item.title}</ThemedText>
        
        <View style={styles.metadataRow}>
           <View style={[styles.statusBadge, { backgroundColor: item.color + '15' }]}>
              <ThemedText style={[styles.statusText, { color: item.color }]}>{item.status}</ThemedText>
           </View>
           <ThemedText style={[styles.timeText, { color: theme.gray }]}>
            {item.time.toLocaleDateString([], { month: 'short', day: 'numeric' })} · {item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </ThemedText>
        </View>
        
        <ThemedText style={[styles.cardDescription, { color: theme.gray }]} numberOfLines={2}>
          {item.subTitle}
        </ThemedText>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top, backgroundColor: isDark ? '#020617' : '#F1F5F9' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <GlobalHeader />

      <View style={styles.filterSection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(f) => f.id}
          contentContainerStyle={styles.filterScroll}
          renderItem={({ item: filter }) => {
            const active = activeFilter === filter.id;
            return (
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => setActiveFilter(filter.id)}
                style={[styles.filterBtn, active && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' }, !active && { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#FFF', borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0' }]}
              >
                {filter.id !== 'all' && <Ionicons name={filter.icon as any} size={14} color={active ? '#FFF' : (filter.color || theme.gray)} style={{ marginRight: 6 }} />}
                <ThemedText style={[styles.filterText, { color: active ? '#FFF' : theme.text }]}>{filter.label}</ThemedText>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}><ActivityIndicator color="#3B82F6" size="large" /></View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ActivityCard item={item} />}
          contentContainerStyle={styles.listContainer}
          onRefresh={fetchHistory}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <View style={styles.emptyCircle}>
                <Ionicons name="document-text-outline" size={80} color="#3B82F6" style={{ opacity: 0.1 }} />
              </View>
              <ThemedText style={{ color: theme.gray, marginTop: 24, fontWeight: '800', letterSpacing: 1 }}>NO ACTIVITY FOUND</ThemedText>
            </View>
          }
        />
      )}

      {/* 🔮 PREMIUM MODAL VIEW */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? '#020617' : '#FFFFFF' }]}>
          <LinearGradient colors={['#3B82F620', 'transparent']} style={StyleSheet.absoluteFill} />
          <View style={{ paddingTop: insets.top + 20, flex: 1 }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                 <Ionicons name="chevron-down" size={24} color="#3B82F6" />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 15 }}>
                <ThemedText style={styles.modalTypeBadge}>{selectedDoc?.type?.toUpperCase()}</ThemedText>
                <ThemedText style={[styles.modalTitle, { color: theme.text }]}>{selectedDoc?.title}</ThemedText>
              </View>
            </View>

            <FlatList
              data={[1]}
              keyExtractor={() => 'content'}
              renderItem={() => (
                <View style={styles.modalContent}>
                   <RichTextRenderer 
                      content={selectedDoc?.content} 
                      highlightColor={selectedDoc?.color || '#3B82F6'} 
                      textColor={isDark ? '#FFF' : '#1E293B'}
                      isDark={isDark}
                   />
                   
                   <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.doneBtn, { backgroundColor: selectedDoc?.color || '#3B82F6' }]}>
                      <ThemedText style={styles.doneBtnText}>FINISHED REVIEW</ThemedText>
                      <Ionicons name="sparkles" size={18} color="#FFF" />
                   </TouchableOpacity>
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 100 }}
            />
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterSection: { paddingVertical: 15 },
  filterScroll: { paddingHorizontal: 20, gap: 10, paddingBottom: 5 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 42, borderRadius: 14, borderWidth: 1.5, boxShadow: '0px 4px 10px rgba(0,0,0,0.05)' },
  filterText: { fontSize: 13, fontWeight: '800' },
  
  listContainer: { paddingHorizontal: 20, paddingBottom: 150 },
  card: { padding: 22, borderRadius: 32, borderWidth: 1, marginBottom: 20, overflow: 'hidden', boxShadow: '0px 10px 20px rgba(0,0,0,0.05)', elevation: 4 },
  cardGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 60 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: { width: 32, height: 32, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  typeLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  trashCircle: { padding: 4 },
  cardTitle: { fontSize: 20, fontWeight: '900', marginBottom: 10, letterSpacing: -0.5 },
  metadataRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  timeText: { fontSize: 11, fontWeight: '700', opacity: 0.6 },
  cardDescription: { fontSize: 13, lineHeight: 22, fontWeight: '600', opacity: 0.8 },
  
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(59,130,246,0.05)', justifyContent: 'center', alignItems: 'center' },

  // Modal Styles
  modalOverlay: { flex: 1 },
  modalHeader: { paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  modalCloseBtn: { width: 50, height: 50, borderRadius: 18, backgroundColor: 'rgba(59,130,246,0.1)', justifyContent: 'center', alignItems: 'center' },
  modalTypeBadge: { fontSize: 10, fontWeight: '900', color: '#3B82F6', letterSpacing: 2, marginBottom: 4 },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  modalContent: { paddingHorizontal: 20, marginTop: 10 },
  doneBtn: { marginTop: 30, height: 65, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, boxShadow: '0px 10px 20px rgba(0,0,0,0.15)', elevation: 10 },
  doneBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 2 }
});
