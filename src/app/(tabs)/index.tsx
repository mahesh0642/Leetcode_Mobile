import { useAuth } from '@/hooks/use-auth'
import { fetchProblems, fetchSolvedCount, type ProblemListItem } from '@/lib/problems'
import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function DashboardScreen() {
  const { user } = useAuth()
  const router = useRouter()

  const [problems, setProblems] = useState<ProblemListItem[]>([])
  const [solvedCount, setSolvedCount] = useState<number>(0)
  const [solvedProblemIds, setSolvedProblemIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Live timer for Daily Challenge
  const [timeLeft, setTimeLeft] = useState('')

  // Difficulty breakdown counts for the home widgets
  const [diffStats, setDiffStats] = useState({
    easy: { solved: 0, total: 0 },
    medium: { solved: 0, total: 0 },
    hard: { solved: 0, total: 0 },
  })

  // Timer helper
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)
      const diff = endOfDay.getTime() - now.getTime()

      const hrs = Math.floor(diff / (1000 * 60 * 60))
      const mins = Math.floor((diff / (1000 * 60)) % 60)
      setTimeLeft(`${hrs}h ${mins}m left`)
    }

    updateTimer()
    const timer = setInterval(updateTimer, 60000)
    return () => clearInterval(timer)
  }, [])

  async function loadData(silent = false) {
    if (!user) return
    if (!silent) setIsLoading(true)
    try {
      const [problemsData, count, solvedList] = await Promise.all([
        fetchProblems(),
        fetchSolvedCount(user.id),
        supabase.from('problem_solved').select('problem_id').eq('user_id', user.id),
      ])

      setProblems(problemsData)
      setSolvedCount(count)

      const solvedIds = new Set((solvedList.data ?? []).map((s) => s.problem_id))
      setSolvedProblemIds(solvedIds)

      // Calculate mini breakdowns for home page display
      const newStats = {
        easy: { solved: 0, total: 0 },
        medium: { solved: 0, total: 0 },
        hard: { solved: 0, total: 0 },
      }

      problemsData.forEach((prob) => {
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
      setDiffStats(newStats)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const getGreeting = () => {
    const hr = new Date().getHours()
    if (hr < 12) return 'Good morning,'
    if (hr < 17) return 'Good afternoon,'
    return 'Good evening,'
  }

  // Pick the first problem as the "Daily Challenge"
  const dailyProblem = problems[0]
  // Recommended problems (excluding daily, max 3)
  const recommendedProblems = problems.slice(1, 4)

  const renderHeader = () => {
    const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Coder'

    return (
      <View style={styles.headerContainer}>
        {/* User Info & Welcome */}
        <View style={styles.welcomeRow}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.username}>{username}</Text>
          </View>
          <View style={styles.statusBox}>
            <View style={styles.pulseDot} />
            <Text style={styles.statusLabelText}>Active</Text>
          </View>
        </View>

        {/* Stats Glassmorphism Grid */}
        <View style={styles.statsCard}>
          <View style={styles.statSummaryRow}>
            <View style={styles.circularProgressPlaceholder}>
              <Text style={styles.progressPercentText}>
                {problems.length > 0 ? Math.round((solvedCount / problems.length) * 100) : 0}%
              </Text>
              <Text style={styles.progressSub}>completed</Text>
            </View>

            <View style={styles.statsCountColumn}>
              <View style={styles.overallStatBox}>
                <Text style={styles.statLabel}>SOLVED PROBLEMS</Text>
                <Text style={styles.overallSolved}>
                  {solvedCount} <Text style={styles.overallTotal}>/ {problems.length}</Text>
                </Text>
              </View>
              <View style={styles.streakIndicatorRow}>
                <Ionicons name="flame" size={18} color={colors.peach} />
                <Text style={styles.streakText}>3 days coding streak</Text>
              </View>
            </View>
          </View>

          {/* Segmented difficulty lines */}
          <View style={styles.progressBarsSection}>
            <View style={styles.miniBarRow}>
              <View style={[styles.bulletPoint, { backgroundColor: colors.success }]} />
              <Text style={styles.miniBarText}>Easy: {diffStats.easy.solved}/{diffStats.easy.total}</Text>
              <View style={styles.miniBarBg}>
                <View
                  style={[
                    styles.miniBarFill,
                    {
                      backgroundColor: colors.success,
                      width: `${diffStats.easy.total > 0 ? (diffStats.easy.solved / diffStats.easy.total) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.miniBarRow}>
              <View style={[styles.bulletPoint, { backgroundColor: colors.warning }]} />
              <Text style={styles.miniBarText}>Med: {diffStats.medium.solved}/{diffStats.medium.total}</Text>
              <View style={styles.miniBarBg}>
                <View
                  style={[
                    styles.miniBarFill,
                    {
                      backgroundColor: colors.warning,
                      width: `${diffStats.medium.total > 0 ? (diffStats.medium.solved / diffStats.medium.total) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.miniBarRow}>
              <View style={[styles.bulletPoint, { backgroundColor: colors.danger }]} />
              <Text style={styles.miniBarText}>Hard: {diffStats.hard.solved}/{diffStats.hard.total}</Text>
              <View style={styles.miniBarBg}>
                <View
                  style={[
                    styles.miniBarFill,
                    {
                      backgroundColor: colors.danger,
                      width: `${diffStats.hard.total > 0 ? (diffStats.hard.solved / diffStats.hard.total) * 100 : 0}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Daily Challenge Spotlight Card */}
        {dailyProblem && (
          <View style={styles.dailyContainer}>
            <View style={styles.dailyHeader}>
              <View style={styles.dailyBadge}>
                <Ionicons name="calendar-sharp" size={14} color={colors.lime} />
                <Text style={styles.dailyBadgeText}>DAILY CHALLENGE</Text>
              </View>
              <View style={styles.timerBadge}>
                <Feather name="clock" size={12} color={colors.lime} />
                <Text style={styles.timerText}>{timeLeft}</Text>
              </View>
            </View>

            <Text style={styles.dailyTitle}>{dailyProblem.title}</Text>
            <View style={styles.dailyMeta}>
              <View style={[styles.diffBadge, styles.diffEasy]}>
                <Text style={[styles.diffText, { color: colors.success }]}>
                  {dailyProblem.difficulty}
                </Text>
              </View>
              <Text style={styles.dailyTags}>{dailyProblem.tags.slice(0, 2).join(' · ')}</Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.dailyButton, pressed && styles.buttonPressed]}
              onPress={() => router.push(`/(tabs)/problems/${dailyProblem.id}`)}
            >
              <Text style={styles.dailyButtonText}>Solve Challenge</Text>
              <Feather name="arrow-right" size={16} color={colors.background} />
            </Pressable>
          </View>
        )}

        {/* Recommended Header */}
        {recommendedProblems.length > 0 && (
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
          </View>
        )}
      </View>
    )
  }

  const renderItem = ({ item }: { item: ProblemListItem }) => {
    const isEasy = item.difficulty === 'EASY'
    const isMedium = item.difficulty === 'MEDIUM'
    const isSolved = solvedProblemIds.has(item.id)

    return (
      <Pressable
        style={({ pressed }) => [styles.problemCard, pressed && styles.problemCardPressed]}
        onPress={() => router.push(`/(tabs)/problems/${item.id}`)}
      >
        <View style={styles.problemInfo}>
          <View style={styles.problemTitleRow}>
            {isSolved && (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.success}
                style={{ marginRight: 6 }}
              />
            )}
            <Text
              style={[
                styles.problemTitleText,
                isSolved && { color: colors.muted, textDecorationLine: 'line-through' },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
          </View>
          <View style={styles.tagList}>
            {item.tags.slice(0, 2).map((tag, idx) => (
              <View key={idx} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.problemRight}>
          <View
            style={[
              styles.diffBadge,
              isEasy ? styles.diffEasy : isMedium ? styles.diffMedium : styles.diffHard,
            ]}
          >
            <Text
              style={[
                styles.diffText,
                { color: isEasy ? colors.success : isMedium ? colors.warning : colors.danger },
              ]}
            >
              {item.difficulty}
            </Text>
          </View>
        </View>
      </Pressable>
    )
  }

  const renderFooter = () => {
    return (
      <View>
        <Pressable
          style={({ pressed }) => [styles.exploreAllBtn, pressed && styles.buttonPressed]}
          onPress={() => router.push('/(tabs)/problems' as never)}
        >
          <Text style={styles.exploreAllBtnText}>Explore All Problems</Text>
          <Feather name="arrow-right" size={16} color={colors.lime} />
        </Pressable>

        {/* Motivational alert card */}
        <View style={styles.quoteCard}>
          <Ionicons name="bulb-outline" size={20} color={colors.lime} />
          <View style={{ flex: 1 }}>
            <Text style={styles.quoteTitle}>DAILY FOCUS</Text>
            <Text style={styles.quoteText}>
              &quot;Consistency is what transforms average into excellence. Solve a single coding task a day to compile your mastery.&quot;
            </Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isLoading && !isRefreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.lime} />
        </View>
      ) : (
        <FlatList
          data={recommendedProblems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={recommendedProblems.length > 0 ? renderFooter : undefined}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true)
                loadData(true)
              }}
              tintColor={colors.lime}
            />
          }
        />
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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerContainer: {
    paddingTop: 16,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  greeting: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  username: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: '800',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(134, 239, 172, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(134, 239, 172, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  statusLabelText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
  },
  statsCard: {
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 20,
    marginBottom: 24,
  },
  statSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 16,
  },
  circularProgressPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: colors.limeBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(189, 240, 110, 0.03)',
  },
  progressPercentText: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '800',
  },
  progressSub: {
    color: colors.mutedDark,
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statsCountColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  overallStatBox: {
    marginBottom: 6,
  },
  statLabel: {
    color: colors.mutedDark,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  overallSolved: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: '800',
  },
  overallTotal: {
    color: colors.muted,
    fontSize: 13,
  },
  streakIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    color: colors.peach,
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarsSection: {
    paddingTop: 16,
    gap: 8,
  },
  miniBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  miniBarText: {
    color: colors.muted,
    fontSize: 11,
    width: 80,
    fontWeight: '500',
  },
  miniBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  dailyContainer: {
    borderRadius: 24,
    backgroundColor: colors.limeSoft,
    borderWidth: 1,
    borderColor: colors.limeBorder,
    padding: 20,
    marginBottom: 24,
  },
  dailyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dailyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dailyBadgeText: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(189, 240, 110, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timerText: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: '700',
  },
  dailyTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  dailyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  diffEasy: {
    backgroundColor: colors.successBg,
  },
  diffMedium: {
    backgroundColor: colors.warningBg,
  },
  diffHard: {
    backgroundColor: colors.dangerBg,
  },
  diffText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dailyTags: {
    color: colors.muted,
    fontSize: 12,
  },
  dailyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.lime,
    paddingVertical: 12,
    borderRadius: 14,
  },
  dailyButtonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 14,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 17,
    fontWeight: '700',
  },
  problemCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  problemCardPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  problemInfo: {
    flex: 1,
    marginRight: 12,
  },
  problemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  problemTitleText: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagChipText: {
    color: colors.muted,
    fontSize: 10,
  },
  problemRight: {
    alignItems: 'flex-end',
  },
  exploreAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.limeBorder,
    backgroundColor: colors.card,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  exploreAllBtnText: {
    color: colors.lime,
    fontSize: 14,
    fontWeight: '700',
  },
  quoteCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  quoteTitle: {
    color: colors.lime,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  quoteText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
})