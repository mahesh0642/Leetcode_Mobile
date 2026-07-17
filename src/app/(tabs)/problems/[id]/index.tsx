import { fetchProblemById, getConstraintLines, getExamples, type Problem } from '@/lib/problems'
import { colors } from '@/lib/theme'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
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

export default function ProblemDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const [problem, setProblem] = useState<Problem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    async function loadProblem() {
      if (!id) return
      setIsLoading(true)
      try {
        const data = await fetchProblemById(id)
        setProblem(data)
      } catch (err) {
        console.error('Failed to load problem details:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadProblem()
  }, [id])

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.lime} />
      </View>
    )
  }

  if (!problem) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={styles.errorText}>Problem not found</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const isEasy = problem.difficulty === 'EASY'
  const isMedium = problem.difficulty === 'MEDIUM'
  const examples = getExamples(problem)
  const constraintsList = getConstraintLines(problem.constraints)

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Custom Header */}
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Problem Detail
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Title and Difficulty */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{problem.title}</Text>
          <View style={styles.metaRow}>
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
                {problem.difficulty}
              </Text>
            </View>
            <Text style={styles.dateText}>Created {new Date(problem.created_at).toLocaleDateString()}</Text>
          </View>

          {/* Tags */}
          <View style={styles.tagRow}>
            {problem.tags.map((tag, idx) => (
              <View key={idx} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.separator} />

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.bodyText}>{problem.description}</Text>
        </View>

        {/* Examples */}
        {examples.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Examples</Text>
            {examples.map((example, idx) => (
              <View key={idx} style={styles.exampleCard}>
                <Text style={styles.exampleHeading}>Example {idx + 1}:</Text>
                
                <View style={styles.codeBlock}>
                  <Text style={styles.codeLabel}>Input:</Text>
                  <Text style={styles.codeText}>{example.input}</Text>
                </View>

                <View style={styles.codeBlock}>
                  <Text style={styles.codeLabel}>Output:</Text>
                  <Text style={styles.codeText}>{example.output}</Text>
                </View>

                {example.explanation && (
                  <View style={styles.explanationBlock}>
                    <Text style={styles.explanationLabel}>Explanation:</Text>
                    <Text style={styles.explanationText}>{example.explanation}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Constraints */}
        {constraintsList.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Constraints</Text>
            <View style={styles.constraintsCard}>
              {constraintsList.map((constraint, idx) => (
                <View key={idx} style={styles.constraintRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.constraintText}>{constraint}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Hints */}
        {problem.hints && (
          <View style={styles.section}>
            <Pressable
              style={styles.hintHeader}
              onPress={() => setShowHint((prev) => !prev)}
            >
              <View style={styles.hintTitleRow}>
                <Ionicons name="help-buoy-outline" size={18} color={colors.peach} />
                <Text style={styles.hintTitle}>Need a hint?</Text>
              </View>
              <Feather
                name={showHint ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.muted}
              />
            </Pressable>
            
            {showHint && (
              <View style={styles.hintCard}>
                <Text style={styles.hintText}>{problem.hints}</Text>
              </View>
            )}
          </View>
        )}

        {/* Gap for bottom button */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom CTA bar */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.ctaButton, pressed && styles.buttonPressed]}
          onPress={() => router.push(`/(tabs)/problems/${problem.id}/solve`)}
        >
          <Ionicons name="code-slash" size={18} color={colors.background} />
          <Text style={styles.ctaButtonText}>Solve Challenge</Text>
        </Pressable>
      </View>
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
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorText: {
    color: colors.muted,
    fontSize: 16,
  },
  backBtn: {
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  backBtnText: {
    color: colors.foreground,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headerTitle: {
    color: colors.foreground,
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 80, // buffer for sticky bottom CTA
  },
  titleSection: {
    marginBottom: 20,
  },
  title: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
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
  dateText: {
    color: colors.mutedDark,
    fontSize: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tagChipText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 4,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  bodyText: {
    color: colors.foreground,
    opacity: 0.88,
    fontSize: 15,
    lineHeight: 22,
  },
  exampleCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  exampleHeading: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  codeBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  codeLabel: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: '600',
    width: 60,
    fontFamily: 'monospace',
  },
  codeText: {
    color: colors.foreground,
    fontSize: 12,
    flex: 1,
    fontFamily: 'monospace',
  },
  explanationBlock: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 8,
  },
  explanationLabel: {
    color: colors.peach,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  explanationText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  constraintsCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 16,
  },
  constraintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bullet: {
    color: colors.lime,
    fontSize: 14,
    width: 14,
  },
  constraintText: {
    color: colors.foreground,
    opacity: 0.8,
    fontSize: 13,
    flex: 1,
    fontFamily: 'monospace',
  },
  hintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 16,
  },
  hintTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hintTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  hintCard: {
    backgroundColor: 'rgba(253, 186, 116, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(253, 186, 116, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  hintText: {
    color: colors.foreground,
    opacity: 0.85,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 10, 12, 0.85)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.lime,
    paddingVertical: 14,
    borderRadius: 16,
  },
  ctaButtonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 15,
  },
  buttonPressed: {
    opacity: 0.85,
  },
})