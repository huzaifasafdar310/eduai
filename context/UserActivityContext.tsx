import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { activityService, UserActivity, StudySession, ActivityType } from '../services/activityService';

interface AnalyticsData {
  activities: UserActivity[];
  sessions: StudySession[];
  stats: {
    totalTasks: number;
    totalStudyTime: number; // in minutes
    streak: number;
    avgAccuracy: number;
    completionRate: number;
  };
}

interface UserActivityContextType {
  data: AnalyticsData;
  loading: boolean;
  logActivity: (type: ActivityType, details: string, score?: number) => Promise<void>;
  startSession: (type?: ActivityType) => Promise<string | undefined>;
  endSession: (sessionId: string | undefined) => Promise<void>;
  refreshStats: () => Promise<void>;
}

const UserActivityContext = createContext<UserActivityContextType | undefined>(undefined);

/**
 * 📈 UserActivityProvider: High-Performance Analytics & Tracking
 * Implements Optimistic Updates and Debounced Fetching to reduce DB load.
 */
export function UserActivityProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AnalyticsData>({
    activities: [],
    sessions: [],
    stats: {
      totalTasks: 0,
      totalStudyTime: 0,
      streak: 0,
      avgAccuracy: 0,
      completionRate: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  
  // Ref for debounced refresh
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Pure function for calculating stats from raw data
   */
  const calculateStats = (activities: UserActivity[], sessions: StudySession[]) => {
    const totalTasks = activities.length;
    const totalStudyTime = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
    
    let streak = 0;
    if (activities.length > 0) {
      const dates = [...new Set(activities.map(a => a.created_at.split('T')[0]))].sort().reverse();
      let checkDate = new Date();
      
      for (let i = 0; i < dates.length; i++) {
        const d = dates[i];
        const expected = checkDate.toISOString().split('T')[0];
        if (d === expected) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    const scoresWithValues = activities.filter(a => a.score !== undefined);
    const avgAccuracy = scoresWithValues.length > 0 
      ? scoresWithValues.reduce((a, b) => a + (b.score || 0), 0) / scoresWithValues.length 
      : 0;

    const completionRate = sessions.length > 0 
      ? Math.min(100, Math.round((totalTasks / sessions.length) * 100)) 
      : (totalTasks > 0 ? 100 : 0);

    return {
      totalTasks,
      totalStudyTime,
      streak,
      avgAccuracy,
      completionRate,
    };
  };

  /**
   * Standard refresh stats (fetches from server)
   */
  const refreshStats = useCallback(async () => {
    // Clear any pending debounced refresh since we are fetching now
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);

    setLoading(true);
    try {
      const result = await activityService.fetchDashboardData();
      if (result) {
        setData({
          activities: result.activities,
          sessions: result.sessions,
          stats: calculateStats(result.activities, result.sessions),
        });
      }
    } catch (err) {
      console.error('[Activity Context] Refresh failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 🕒 DEBOUNCED REFRESH
   * Prevents multiple rapid fetches from Supabase.
   */
  const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = setTimeout(() => {
      console.log('[Activity Context] Executing debounced sync...');
      refreshStats();
    }, 2000); // 2-second debounce window as specified
  }, [refreshStats]);

  useEffect(() => {
    refreshStats();
    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [refreshStats]);

  /**
   * ⚡ OPTIMISTIC LOGGING
   * Update UI immediately, then sync with DB in background.
   */
  const logActivity = useCallback(async (type: ActivityType, details: string, score?: number) => {
    // 1. Optimistic Update (Local State Only)
    const optimisticActivity: UserActivity = {
      id: `temp-${Date.now()}`,
      user_id: 'pending',
      type,
      details,
      score,
      created_at: new Date().toISOString()
    };

    setData(prev => {
      const updatedActivities = [optimisticActivity, ...prev.activities];
      return {
        ...prev,
        activities: updatedActivities,
        stats: calculateStats(updatedActivities, prev.sessions)
      };
    });

    // 2. Persistent Update (Server Call)
    try {
      await activityService.logActivity(type, details, score);
      // 3. Instead of immediate refreshStats(), we queue a debounced sync
      debouncedRefresh();
    } catch (err) {
      console.error('[Activity Context] Failed to persist activity:', err);
      // Optional: rollback or mark as failed
      refreshStats(); // Full refresh on error to restore consistency
    }
  }, [debouncedRefresh, refreshStats]);

  const startSession = useCallback(async (type?: ActivityType) => {
    const session = await activityService.startSession(type);
    if (session) {
      // Optimistically add session to local state
      setData(prev => ({
        ...prev,
        sessions: [session, ...prev.sessions]
      }));
    }
    return session?.id;
  }, []);

  const endSession = useCallback(async (sessionId: string | undefined) => {
    if (!sessionId) return;
    try {
      await activityService.endSession(sessionId);
      debouncedRefresh();
    } catch (err) {
      refreshStats();
    }
  }, [debouncedRefresh, refreshStats]);

  // 💎 Memoize context value
  const contextValue = useMemo(() => ({ 
    data, 
    loading, 
    logActivity, 
    startSession, 
    endSession, 
    refreshStats 
  }), [data, loading, logActivity, startSession, endSession, refreshStats]);

  return (
    <UserActivityContext.Provider value={contextValue}>
      {children}
    </UserActivityContext.Provider>
  );
}

export const useUserActivity = () => {
  const context = useContext(UserActivityContext);
  if (context === undefined) {
    throw new Error('useUserActivity must be used within a UserActivityProvider');
  }
  return context;
}
