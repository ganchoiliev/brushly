import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoldButton } from '@/components/gold-button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import {
  attachRenderToLead,
  listLeads,
  useStaffSession,
  type StaffLead,
} from '@/lib/staff';

/* Staff-only: pick the lead this render belongs to. Searches the CRM by
   name or phone; recent leads shown by default. */
export default function AttachScreen() {
  const router = useRouter();
  const { renderId } = useLocalSearchParams<{ renderId: string }>();
  const hasSession = useStaffSession() !== null;

  const [query, setQuery] = useState('');
  const [leads, setLeads] = useState<StaffLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attaching, setAttaching] = useState<string | null>(null);
  const [attached, setAttached] = useState<StaffLead | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Debounce so we don't hit the API per keystroke.
    const timer = setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      listLeads(query)
        .then((data) => {
          if (!cancelled) setLeads(data);
        })
        .catch((e: unknown) => {
          if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load leads.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // hasSession is a dep so a re-sign-in (push /staff, sign in, pop back)
    // refetches without the user having to touch the search box.
  }, [query, hasSession]);

  const authError = error !== null && /sign in/i.test(error);

  async function handleAttach(lead: StaffLead) {
    if (attaching || !renderId) return;
    setAttaching(lead.id);
    setError(null);
    try {
      await attachRenderToLead(String(renderId), lead.id);
      setAttached(lead);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not attach the render.');
    } finally {
      setAttaching(null);
    }
  }

  if (attached) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.done}>
          <Text style={styles.title}>Attached</Text>
          <Text style={styles.sub}>
            This render is now on {attached.name}’s lead record — it’ll show
            up in the admin CRM.
          </Text>
          <GoldButton label="Done" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Attach to lead</Text>
        <TextInput
          style={styles.search}
          placeholder="Search name or phone…"
          placeholderTextColor={Colors.creamFaint}
          autoCapitalize="none"
          value={query}
          onChangeText={setQuery}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        {authError && (
          <GoldButton
            label="Sign in"
            onPress={() => router.push('/staff')}
          />
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.gold} style={styles.spinner} />
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(lead) => lead.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No leads found.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Attach to ${item.name}`}
              disabled={attaching !== null}
              onPress={() => handleAttach(item)}
              style={styles.lead}
            >
              <View style={styles.leadCopy}>
                <Text style={styles.leadName}>{item.name}</Text>
                <Text style={styles.leadMeta}>
                  {[item.phone, item.service, item.status]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              {attaching === item.id ? (
                <ActivityIndicator color={Colors.gold} />
              ) : (
                <Text style={styles.leadAction}>Attach</Text>
              )}
            </Pressable>
          )}
        />
      )}

      <View style={styles.footer}>
        <GoldButton label="Cancel" variant="ghost" onPress={() => router.back()} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.charcoal,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  done: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.md,
  },
  sub: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.creamFaint,
    maxWidth: 320,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 30,
    color: Colors.cream,
  },
  search: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.hairline,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.goldLight,
  },
  spinner: {
    marginTop: Spacing.xl,
  },
  list: {
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  empty: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.creamFaint,
    textAlign: 'center',
    paddingTop: Spacing.xl,
  },
  lead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.hairline,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  leadCopy: {
    gap: 2,
    flexShrink: 1,
  },
  leadName: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    color: Colors.cream,
  },
  leadMeta: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.creamFaint,
  },
  leadAction: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.gold,
  },
  footer: {
    paddingBottom: Spacing.lg,
  },
});
