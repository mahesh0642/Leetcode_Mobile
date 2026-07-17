import { useAuth } from '@/hooks/use-auth'
import { fetchProblems, type ProblemListItem } from '@/lib/problems'
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
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ProblemsCatalogScreen() {
  const { user } = useAuth()
  const router = useRouter()

  const [problems, setProblems] = useState<ProblemListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL')

  async function loadProblems(silent = false) {
    if (!user) return
    if (!silent) setIsLoading(true)
    try {
      const data = await fetchProblems()
      setProblems(data)
    } catch (err) {
      console.error('Failed to fetch problems catalog:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadProblems()
    }
  }, [user])

  const filteredProblems = problems.filter((prob) => {
    const matchesSearch =
      prob.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prob.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesDifficulty = selectedDifficulty === 'ALL' || prob.difficulty === selectedDifficulty
    return matchesSearch && matchesDifficulty
  })

  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <Text style={styles.pageTitle}>Problems</Text>
        <Text style={styles.pageSubtitle}>Polish your coding skills on the go</Text>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            placeholder="Search by title or topic..."
            placeholderTextColor={colors.mutedDark}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        {/* Difficulty Filter Chips */}
        <View style={styles.filterRow}>
          {(['ALL', 'EASY', 'MEDIUM', 'HARD'] as const).map((diff) => {
            const active = selectedDifficulty === diff
            return (
              <Pressable
                key={diff}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedDifficulty(diff)}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {diff === 'ALL' ? 'All' : diff.toLowerCase()}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    )
  }

  const renderItem = ({ item }: { item: ProblemListItem }) => {
    const isEasy = item.difficulty === 'EASY'
    const isMedium = item.difficulty === 'MEDIUM'
    return (
      <Pressable
        style={({ pressed }) => [styles.problemCard, pressed && styles.problemCardPressed]}
        onPress={() => router.push(`/(tabs)/problems/${item.id}`)}
      >
        <View style={styles.problemInfo}>
          <Text style={styles.problemTitleText}>{item.title}</Text>
          <View style={styles.tagList}>
            {item.tags.slice(0, 3).map((tag, idx) => (
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
          <Feather name="chevron-right" size={16} color={colors.muted} style={{ marginTop: 8 }} />
        </View>
      </Pressable>
    )
  }

  const renderEmpty = () => {
    if (isLoading) return null
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={48} color={colors.mutedDark} />
        <Text style={styles.emptyText}>No problems matched your search</Text>
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
          data={filteredProblems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true)
                loadProblems(true)
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
    marginBottom: 8,
  },
  pageTitle: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: '800',
  },
  pageSubtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: 14,
    marginLeft: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: colors.foreground,
    borderColor: colors.foreground,
  },
  filterChipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.background,
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
  problemTitleText: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '600',
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
  },
})
