import { useAuth } from '@/hooks/use-auth'
import { fetchProblems, fetchUserSubmissionActivity, toDateKey, type ProblemListItem } from '@/lib/problems'
import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type DifficultyStats = {
  easy: { solved: number; total: number }
  medium: { solved: number; total: number }
  hard: { solved: number; total: number }
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<DifficultyStats>({
    easy: { solved: 0, total: 0 },
    medium: { solved: 0, total: 0 },
    hard: { solved: 0, total: 0 },
  })
  const [heatmapDays, setHeatmapDays] = useState<Array<{ date: Date; count: number }>>([])

  async function loadProfileData() {
    if (!user) return
    setIsLoading(true)
    try {
      // 1. Fetch all problems
      const allProblems = await fetchProblems()
      
      // 2. Fetch user's solved problems
      const { data: solvedList } = await supabase
        .from('problem_solved')
        .select('problem_id')
        .eq('user_id', user.id)

      const solvedIds = new Set((solvedList ?? []).map((s) => s.problem_id))

      // Calculate stats
      const newStats = {
        easy: { solved: 0, total: 0 },
        medium: { solved: 0, total: 0 },
        hard: { solved: 0, total: 0 },
      }

      allProblems.forEach((prob) => {
        const isSolved = solvedIds.has(prob.id)
        if (prob.difficulty === 'EASY') {
          newStats.easy.total++
          if (isSolved) newStats.easy.solved++
        } else if (prob.difficulty === 'MEDIUM') {
          newStats.medium.total++
          if (isSolved) newStats.medium.solved++
        } else if (prob.difficulty === 'HARD') {
          newStats.hard.total++
          if (isSolved) newStats.hard.solved++
        }
      })
      setStats(newStats)

      // 3. Fetch activity for the heatmap (last 84 days / 12 weeks)
      const activityMap = await fetchUserSubmissionActivity(user.id, 84)
      const days = []
      const today = new Date()
      for (let i = 83; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const key = toDateKey(d)
        const count = activityMap.get(key) ?? 0
        days.push({ date: d, count })
      }
      setHeatmapDays(days)
    } catch (err) {
      console.error('Failed to load profile stats:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProfileData()
  }, [user])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  // Chunk days into weeks (columns)
  const weeks = []
  if (heatmapDays.length > 0) {
    for (let i = 0; i < heatmapDays.length; i += 7) {
      weeks.push(heatmapDays.slice(i, i + 7))
    }
  }

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Coder'
  const email = user?.email || 'N/A'

  // Total Solved
  const totalSolved = stats.easy.solved + stats.medium.solved + stats.hard.solved
  const totalProblems = stats.easy.total + stats.medium.total + stats.hard.total

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.lime} />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Profile Header Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarText}>{username[0].toUpperCase()}</Text>
            </View>
            <Text style={styles.fullName}>{username}</Text>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          {/* Stats Segment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Difficulty Breakdown</Text>
            <View style={styles.statsCard}>
              {/* Total solved ring mock */}
              <View style={styles.overallStatBox}>
                <Text style={styles.overallSolved}>{totalSolved}</Text>
                <Text style={styles.overallTotal}>/ {totalProblems} Solved</Text>
              </View>

              {/* Progress bars */}
              <View style={styles.barsContainer}>
                {/* Easy */}
                <View style={styles.progressRow}>
                  <View style={styles.progressLabelRow}>
                    <Text style={[styles.progressLabel, { color: colors.success }]}>Easy</Text>
                    <Text style={styles.progressCount}>
                      {stats.easy.solved}/{stats.easy.total}
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          backgroundColor: colors.success,
                          width: `${stats.easy.total > 0 ? (stats.easy.solved / stats.easy.total) * 100 : 0}%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Medium */}
                <View style={styles.progressRow}>
                  <View style={styles.progressLabelRow}>
                    <Text style={[styles.progressLabel, { color: colors.warning }]}>Medium</Text>
                    <Text style={styles.progressCount}>
                      {stats.medium.solved}/{stats.medium.total}
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          backgroundColor: colors.warning,
                          width: `${stats.medium.total > 0 ? (stats.medium.solved / stats.medium.total) * 100 : 0}%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Hard */}
                <View style={styles.progressRow}>
                  <View style={styles.progressLabelRow}>
                    <Text style={[styles.progressLabel, { color: colors.danger }]}>Hard</Text>
                    <Text style={styles.progressCount}>
                      {stats.hard.solved}/{stats.hard.total}
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          backgroundColor: colors.danger,
                          width: `${stats.hard.total > 0 ? (stats.hard.solved / stats.hard.total) * 100 : 0}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Submission Heatmap */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Submission Activity</Text>
            <View style={styles.heatmapCard}>
              <View style={styles.heatmapWrapper}>
                <View style={styles.heatmapGrid}>
                  {weeks.map((week, wIdx) => (
                    <View key={wIdx} style={styles.heatmapColumn}>
                      {week.map((day, dIdx) => {
                        let cellBg = 'rgba(255, 255, 255, 0.05)'
                        if (day.count === 1) cellBg = 'rgba(189, 240, 110, 0.35)'
                        else if (day.count === 2) cellBg = 'rgba(189, 240, 110, 0.65)'
                        else if (day.count >= 3) cellBg = colors.lime

                        return (
                          <View
                            key={dIdx}
                            style={[
                              styles.heatmapCell,
                              { backgroundColor: cellBg },
                            ]}
                          />
                        )
                      })}
                    </View>
                  ))}
                </View>
              </View>
              
              {/* Heatmap Legend */}
              <View style={styles.legendRow}>
                <Text style={styles.legendText}>Less</Text>
                <View style={[styles.heatmapCell, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]} />
                <View style={[styles.heatmapCell, { backgroundColor: 'rgba(189, 240, 110, 0.35)' }]} />
                <View style={[styles.heatmapCell, { backgroundColor: 'rgba(189, 240, 110, 0.65)' }]} />
                <View style={[styles.heatmapCell, { backgroundColor: colors.lime }]} />
                <Text style={styles.legendText}>More</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionSection}>
            <Pressable
              style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutButtonPressed]}
              onPress={handleSignOut}
            >
              <Feather name="log-out" size={16} color={colors.danger} />
              <Text style={styles.signOutText}>Sign Out of MobLeet</Text>
            </Pressable>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.limeSoft,
    borderWidth: 1,
    borderColor: colors.limeBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: colors.lime,
    fontSize: 32,
    fontWeight: '800',
  },
  fullName: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  emailText: {
    color: colors.muted,
    fontSize: 13,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    padding: 20,
    gap: 20,
  },
  overallStatBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
  },
  overallSolved: {
    color: colors.foreground,
    fontSize: 28,
    fontWeight: '800',
  },
  overallTotal: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  barsContainer: {
    flex: 1,
    gap: 12,
  },
  progressRow: {
    width: '100%',
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressCount: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  heatmapCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    padding: 16,
  },
  heatmapWrapper: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  heatmapGrid: {
    flexDirection: 'row',
    gap: 4,
  },
  heatmapColumn: {
    gap: 4,
  },
  heatmapCell: {
    width: 10,
    height: 10,
    borderRadius: 2.5,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 12,
  },
  legendText: {
    color: colors.muted,
    fontSize: 11,
  },
  actionSection: {
    marginTop: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(252, 165, 165, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(252, 165, 165, 0.15)',
    borderRadius: 16,
    paddingVertical: 14,
  },
  signOutButtonPressed: {
    backgroundColor: 'rgba(252, 165, 165, 0.08)',
  },
  signOutText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
})