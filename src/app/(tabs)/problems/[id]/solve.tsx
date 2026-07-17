import { useAuth } from '@/hooks/use-auth'
import { fetchProblemById, getStarterCode, type LanguageId, type Problem } from '@/lib/problems'
import { colors } from '@/lib/theme'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Constants from 'expo-constants'

type TabType = 'editor' | 'results'

type SubmissionResult = {
  status: string
  solved: boolean
  passed: number
  total: number
  results: Array<{
    index: number
    input: string
    expectedOutput: string
    actualOutput: string
    stderr: string
    outcome: 'accepted' | 'wrong-answer' | 'error'
    timeSec: number | null
    memoryKb: number | null
  }>
}

export default function SolveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()
  const router = useRouter()

  const [problem, setProblem] = useState<Problem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('editor')

  // Code Editor state
  const [language, setLanguage] = useState<LanguageId>('javascript')
  const [codeMap, setCodeMap] = useState<Record<LanguageId, string>>({
    javascript: '',
    python: '',
    java: '',
  })
  const [showLangDropdown, setShowLangDropdown] = useState(false)

  // Execution state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [selectedCaseIdx, setSelectedCaseIdx] = useState<number>(0)

  const textInputRef = useRef<TextInput>(null)

  // Fetch problem details
  useEffect(() => {
    async function loadProblem() {
      if (!id) return
      setIsLoading(true)
      try {
        const data = await fetchProblemById(id)
        if (data) {
          setProblem(data)
          // Initialize starter codes
          const snippets: Record<LanguageId, string> = {
            javascript: getStarterCode(data, 'javascript'),
            python: getStarterCode(data, 'python'),
            java: getStarterCode(data, 'java'),
          }
          setCodeMap(snippets)
          // Default language to first available
          if (snippets.javascript) setLanguage('javascript')
          else if (snippets.python) setLanguage('python')
          else if (snippets.java) setLanguage('java')
        }
      } catch (err) {
        console.error('Failed to load problem snippet:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadProblem()
  }, [id])

  // Get current editing code
  const currentCode = codeMap[language]
  const setCurrentCode = (text: string) => {
    setCodeMap((prev) => ({ ...prev, [language]: text }))
  }

  // Helper buttons to insert character at cursor
  const insertCharacter = (char: string) => {
    if (!textInputRef.current) return
    
    // Simplest way to append character to code
    setCurrentCode(currentCode + char)
  }

  // Get dynamic local API url
  const getApiUrl = () => {
    const hostUri = Constants.expoConfig?.hostUri
    if (!hostUri) {
      return 'http://localhost:8081/api/submit'
    }
    const ip = hostUri.split(':')[0]
    return `http://${ip}:8081/api/submit`
  }

  // Handle Code Submission
  const handleSubmit = async () => {
    if (!problem || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmissionResult(null)
    setActiveTab('results')

    try {
      const url = getApiUrl()
      const token = session?.access_token

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          problemId: problem.id,
          language,
          sourceCode: currentCode,
        }),
      })

      const responseText = await response.text()
      if (!response.ok) {
        throw new Error(responseText || `Submission failed with status ${response.status}`)
      }

      const data = JSON.parse(responseText) as SubmissionResult
      setSubmissionResult(data)
      setSelectedCaseIdx(0)
    } catch (err) {
      console.error(err)
      setSubmitError(err instanceof Error ? err.message : 'Failed to connect to execution server.')
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <Text style={{ color: colors.muted }}>Could not load code templates.</Text>
        </View>
      </SafeAreaView>
    )
  }

  // Generate line numbers for editor
  const lines = currentCode.split('\n')
  const lineNumbers = Array.from({ length: Math.max(lines.length, 1) }, (_, i) => i + 1)

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={colors.foreground} />
        </Pressable>
        
        {/* Language selector toggle */}
        <Pressable
          style={styles.langSelector}
          onPress={() => setShowLangDropdown((prev) => !prev)}
        >
          <Text style={styles.langSelectorText}>
            {language === 'javascript' ? 'JavaScript' : language === 'python' ? 'Python' : 'Java'}
          </Text>
          <Feather name="chevron-down" size={14} color={colors.lime} />
        </Pressable>

        <View style={styles.placeholder} />
      </View>

      {/* Language Selector Dropdown overlay */}
      {showLangDropdown && (
        <View style={styles.langDropdown}>
          {(['javascript', 'python', 'java'] as LanguageId[]).map((lang) => {
            const label = lang === 'javascript' ? 'JavaScript' : lang === 'python' ? 'Python' : 'Java'
            const active = language === lang
            return (
              <Pressable
                key={lang}
                style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                onPress={() => {
                  setLanguage(lang)
                  setShowLangDropdown(false)
                }}
              >
                <Text style={[styles.dropdownItemText, active && styles.dropdownItemTextActive]}>
                  {label}
                </Text>
                {active && <Ionicons name="checkmark" size={16} color={colors.lime} />}
              </Pressable>
            )
          })}
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'editor' && styles.tabActive]}
          onPress={() => setActiveTab('editor')}
        >
          <Ionicons
            name="code-working-outline"
            size={16}
            color={activeTab === 'editor' ? colors.lime : colors.muted}
          />
          <Text style={[styles.tabText, activeTab === 'editor' && styles.tabTextActive]}>
            Workspace
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'results' && styles.tabActive]}
          onPress={() => setActiveTab('results')}
        >
          <Ionicons
            name="play-outline"
            size={16}
            color={activeTab === 'results' ? colors.lime : colors.muted}
          />
          <Text style={[styles.tabText, activeTab === 'results' && styles.tabTextActive]}>
            Results
            {submissionResult && (
              <Text style={styles.badgeTextSmall}>
                {' '}
                ({submissionResult.passed}/{submissionResult.total})
              </Text>
            )}
          </Text>
        </Pressable>
      </View>

      {/* Main Workspace content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        {activeTab === 'editor' ? (
          <View style={{ flex: 1 }}>
            {/* Helper Accessory Bar */}
            <View style={styles.accessoryBar}>
              <Pressable style={styles.accessoryBtn} onPress={() => insertCharacter('  ')}>
                <Text style={styles.accessoryText}>Tab</Text>
              </Pressable>
              <Pressable style={styles.accessoryBtn} onPress={() => insertCharacter('()')}>
                <Text style={styles.accessoryText}>(</Text>
              </Pressable>
              <Pressable style={styles.accessoryBtn} onPress={() => insertCharacter('{}')}>
                <Text style={styles.accessoryText}>{'{'}</Text>
              </Pressable>
              <Pressable style={styles.accessoryBtn} onPress={() => insertCharacter('[]')}>
                <Text style={styles.accessoryText}>[</Text>
              </Pressable>
              <Pressable style={styles.accessoryBtn} onPress={() => insertCharacter(';')}>
                <Text style={styles.accessoryText}>;</Text>
              </Pressable>
              <Pressable style={styles.accessoryBtn} onPress={() => insertCharacter('=')}>
                <Text style={styles.accessoryText}>=</Text>
              </Pressable>
              <Pressable style={styles.accessoryBtn} onPress={() => insertCharacter('"')}>
                <Text style={styles.accessoryText}>&quot;</Text>
              </Pressable>
            </View>

            {/* Custom Monospace Editor */}
            <ScrollView
              style={styles.editorScrollView}
              contentContainerStyle={{ flexGrow: 1 }}
              showsVerticalScrollIndicator
            >
              <View style={styles.editorContainer}>
                {/* Line Numbers column */}
                <View style={styles.lineNumbersColumn}>
                  {lineNumbers.map((num) => (
                    <Text key={num} style={styles.lineNumberText}>
                      {num}
                    </Text>
                  ))}
                </View>

                {/* Multiline Code Input */}
                <TextInput
                  ref={textInputRef}
                  multiline
                  style={styles.codeTextInput}
                  value={currentCode}
                  onChangeText={setCurrentCode}
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect={false}
                  spellCheck={false}
                  placeholder="// Type your code here..."
                  placeholderTextColor={colors.mutedDark}
                />
              </View>
            </ScrollView>
          </View>
        ) : (
          /* Results tab */
          <ScrollView style={styles.resultsScrollView} contentContainerStyle={styles.resultsContent}>
            {isSubmitting && (
              <View style={styles.statusBox}>
                <ActivityIndicator size="large" color={colors.lime} />
                <Text style={styles.statusTextLarge}>Running Code</Text>
                <Text style={styles.statusTextSmall}>Executing your solution against test cases...</Text>
              </View>
            )}

            {submitError && (
              <View style={[styles.resultBanner, styles.bannerError]}>
                <Ionicons name="warning-outline" size={24} color={colors.danger} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bannerTitle, { color: colors.danger }]}>Execution Error</Text>
                  <Text style={styles.bannerSubtitle}>{submitError}</Text>
                </View>
              </View>
            )}

            {submissionResult && (
              <View>
                {/* Score Summary Card */}
                <View
                  style={[
                    styles.outcomeCard,
                    submissionResult.solved ? styles.outcomeSuccess : styles.outcomeFail,
                  ]}
                >
                  <View style={styles.outcomeRow}>
                    <Text
                      style={[
                        styles.outcomeStatus,
                        { color: submissionResult.solved ? colors.success : colors.danger },
                      ]}
                    >
                      {submissionResult.status}
                    </Text>
                    <Text style={styles.outcomeSolvedCount}>
                      {submissionResult.passed} / {submissionResult.total} Passed
                    </Text>
                  </View>

                  {/* CPU/Memory details if passed */}
                  {submissionResult.solved && submissionResult.results[0] && (
                    <View style={styles.metricRow}>
                      <View style={styles.metric}>
                        <Feather name="clock" size={12} color={colors.muted} />
                        <Text style={styles.metricText}>
                          Runtime: {Math.max(...submissionResult.results.map((r) => r.timeSec ?? 0)).toFixed(3)} s
                        </Text>
                      </View>
                      <View style={styles.metric}>
                        <Feather name="cpu" size={12} color={colors.muted} />
                        <Text style={styles.metricText}>
                          Memory: {Math.max(...submissionResult.results.map((r) => r.memoryKb ?? 0))} KB
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Test case Selector Tabs */}
                <Text style={styles.testCaseTitle}>Test Cases</Text>
                <View style={styles.testCaseTabRow}>
                  {submissionResult.results.map((res, idx) => {
                    const isSelected = selectedCaseIdx === idx
                    const passed = res.outcome === 'accepted'
                    return (
                      <Pressable
                        key={idx}
                        style={[
                          styles.testCaseTab,
                          isSelected && styles.testCaseTabSelected,
                          isSelected && (passed ? styles.borderSuccess : styles.borderFail),
                        ]}
                        onPress={() => setSelectedCaseIdx(idx)}
                      >
                        <View
                          style={[
                            styles.dotIndicator,
                            { backgroundColor: passed ? colors.success : colors.danger },
                          ]}
                        />
                        <Text
                          style={[
                            styles.testCaseTabText,
                            isSelected && styles.testCaseTabTextActive,
                          ]}
                        >
                          Case {idx + 1}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>

                {/* TestCase Detail */}
                {submissionResult.results[selectedCaseIdx] && (
                  <View style={styles.caseDetailsCard}>
                    {/* Stderr / Compilation logs */}
                    {submissionResult.results[selectedCaseIdx].stderr ? (
                      <View style={styles.errorLogs}>
                        <Text style={styles.errorLogHeader}>Stdout/Stderr Diagnostics:</Text>
                        <ScrollView style={styles.errorLogBox}>
                          <Text style={styles.errorLogText}>
                            {submissionResult.results[selectedCaseIdx].stderr}
                          </Text>
                        </ScrollView>
                      </View>
                    ) : null}

                    {/* Input */}
                    <Text style={styles.caseLabel}>Input</Text>
                    <View style={styles.caseDataBox}>
                      <Text style={styles.caseDataText}>
                        {submissionResult.results[selectedCaseIdx].input}
                      </Text>
                    </View>

                    {/* Expected */}
                    <Text style={styles.caseLabel}>Expected Output</Text>
                    <View style={styles.caseDataBox}>
                      <Text style={styles.caseDataText}>
                        {submissionResult.results[selectedCaseIdx].expectedOutput}
                      </Text>
                    </View>

                    {/* Actual */}
                    <Text style={styles.caseLabel}>Actual Output</Text>
                    <View
                      style={[
                        styles.caseDataBox,
                        submissionResult.results[selectedCaseIdx].outcome === 'accepted'
                          ? styles.outputPassed
                          : styles.outputFailed,
                      ]}
                    >
                      <Text style={styles.caseDataText}>
                        {submissionResult.results[selectedCaseIdx].actualOutput || 'Empty/Null'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {!isSubmitting && !submissionResult && !submitError && (
              <View style={styles.emptyResults}>
                <Ionicons name="terminal-outline" size={48} color={colors.mutedDark} />
                <Text style={styles.emptyText}>No results yet.</Text>
                <Text style={styles.emptySubtitle}>Click Submit to execute code against CodeBox.</Text>
              </View>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* Footer bar */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            pressed && styles.buttonPressed,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          disabled={isSubmitting}
          onPress={handleSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <Ionicons name="rocket-outline" size={18} color={colors.background} />
              <Text style={styles.submitButtonText}>Submit Solution</Text>
            </>
          )}
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
  langSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 40,
  },
  langSelectorText: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  langDropdown: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    width: 200,
    backgroundColor: '#121216',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    zIndex: 999,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  dropdownItemText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: colors.lime,
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.lime,
  },
  tabText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.foreground,
  },
  badgeTextSmall: {
    fontSize: 11,
    color: colors.lime,
  },
  accessoryBar: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#0f1014',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  accessoryBtn: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 32,
    alignItems: 'center',
  },
  accessoryText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  editorScrollView: {
    flex: 1,
    backgroundColor: '#0a0a0c',
  },
  editorContainer: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 24,
  },
  lineNumbersColumn: {
    width: 32,
    alignItems: 'flex-end',
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.05)',
  },
  lineNumberText: {
    color: colors.mutedDark,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  codeTextInput: {
    flex: 1,
    color: colors.foreground,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    paddingLeft: 12,
    paddingRight: 16,
    textAlignVertical: 'top',
    paddingTop: 0,
    paddingBottom: 0,
  },
  resultsScrollView: {
    flex: 1,
  },
  resultsContent: {
    padding: 20,
  },
  statusBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  statusTextLarge: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  statusTextSmall: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  resultBanner: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  bannerError: {
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  outcomeCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  outcomeSuccess: {
    backgroundColor: colors.successBg,
    borderColor: colors.success,
  },
  outcomeFail: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.danger,
  },
  outcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outcomeStatus: {
    fontSize: 20,
    fontWeight: '800',
  },
  outcomeSolvedCount: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '600',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  testCaseTitle: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  testCaseTabRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  testCaseTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  testCaseTabSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1.5,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  testCaseTabText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  testCaseTabTextActive: {
    color: colors.foreground,
  },
  borderSuccess: {
    borderColor: colors.success,
  },
  borderFail: {
    borderColor: colors.danger,
  },
  caseDetailsCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  caseLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  caseDataBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    padding: 12,
    borderRadius: 8,
  },
  caseDataText: {
    color: colors.foreground,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  outputPassed: {
    borderWidth: 1,
    borderColor: colors.successBg,
  },
  outputFailed: {
    borderWidth: 1,
    borderColor: colors.dangerBg,
  },
  errorLogs: {
    marginBottom: 8,
  },
  errorLogHeader: {
    color: colors.peach,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  errorLogBox: {
    backgroundColor: 'rgba(253, 186, 116, 0.05)',
    borderColor: 'rgba(253, 186, 116, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 120,
    padding: 10,
  },
  errorLogText: {
    color: colors.foreground,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptyResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: colors.mutedDark,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footer: {
    backgroundColor: 'rgba(10, 10, 12, 0.85)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.lime,
    paddingVertical: 14,
    borderRadius: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 15,
  },
  buttonPressed: {
    opacity: 0.85,
  },
})
