import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AccountBadge } from '../../components/Badge';
import { Avatar, EmptyState, Loading, Segmented } from '../../components/Misc';
import { TextField } from '../../components/TextField';
import { useProfile } from '../../context/AuthContext';
import { useUsers } from '../../hooks/data';
import type { AccountStatus } from '../../types';
import { colors, fonts, radius, spacing } from '../../theme';

/**
 * RFG2: o gestor valida e edita contas de utentes.
 * RFA2: o administrador gere também as contas dos seguranças/gestores.
 */
export function UsersScreen() {
  const navigation = useNavigation();
  const me = useProfile();
  const isAdmin = me.role === 'admin';
  const [role, setRole] = useState<'utente' | 'gestor'>('utente');
  const [status, setStatus] = useState<AccountStatus>('pendente');
  const [search, setSearch] = useState('');
  const { data, loading } = useUsers(role);

  const mine = useMemo(() => data.filter((u) => u.parkId === me.parkId), [data, me.parkId]);
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mine.filter((u) => u.status === status && (!q || u.name.toLowerCase().includes(q) || u.email.includes(q) || u.phone.includes(q)));
  }, [mine, status, search]);
  const count = (s: AccountStatus) => mine.filter((u) => u.status === s).length;

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
      data={list}
      keyExtractor={(u) => u.id}
      ListHeaderComponent={
        <View style={{ gap: spacing.sm }}>
          {isAdmin && (
            <>
              <Segmented
                value={role}
                onChange={(r) => {
                  setRole(r);
                  setStatus(r === 'gestor' ? 'ativo' : 'pendente');
                }}
                options={[
                  { value: 'utente', label: 'Utentes' },
                  { value: 'gestor', label: 'Seguranças/Gestores' },
                ]}
              />
              <AppButton
                title={role === 'gestor' ? 'Criar conta de gestor' : 'Criar conta de utente'}
                icon="person-add-outline"
                variant="secondary"
                onPress={() => navigation.navigate('CreateAccount', { role })}
              />
            </>
          )}
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: 'pendente', label: `Pendentes (${count('pendente')})` },
              { value: 'ativo', label: `Ativos (${count('ativo')})` },
              { value: 'bloqueado', label: `Bloqueados (${count('bloqueado')})` },
            ]}
          />
          <TextField label="Pesquisar" placeholder="Nome, email ou telemóvel" value={search} onChangeText={setSearch} icon="search-outline" />
        </View>
      }
      renderItem={({ item }) => (
        <Pressable style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]} onPress={() => navigation.navigate('UserEdit', { uid: item.id })}>
          <Avatar uri={item.photoURL} name={item.name} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.muted}>
              {item.email} · {item.phone}
            </Text>
          </View>
          <AccountBadge status={item.status} />
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      )}
      ListEmptyComponent={loading ? <Loading /> : <EmptyState icon="people-outline" title="Sem contas nesta lista" />}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontFamily: fonts.bold, color: colors.text },
  muted: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 12 },
});
