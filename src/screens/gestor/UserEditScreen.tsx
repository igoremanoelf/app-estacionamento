import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { AccountBadge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { Avatar, Banner, EmptyState, InfoRow, Loading } from '../../components/Misc';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { useProfile } from '../../context/AuthContext';
import { useCurrentPark } from '../../context/ParkContext';
import { useParkReservations, useUser } from '../../hooks/data';
import type { RootScreenProps } from '../../navigation/types';
import { errorMessage } from '../../services/auth';
import { sendPushToUser } from '../../services/notifications';
import { setUserStatus, updateUserByStaff } from '../../services/users';
import type { AccountStatus } from '../../types';
import { colors, spacing } from '../../theme';
import { formatMoney } from '../../utils/dates';
import { totalPaid } from '../../utils/pricing';

/** RFG2a/RFG2b/RFA2: validar registo, editar perfil e bloquear/reativar contas. */
export function UserEditScreen({ route }: RootScreenProps<'UserEdit'>) {
  const me = useProfile();
  const { parkId } = useCurrentPark();
  const { data: user, loading } = useUser(route.params.uid);
  const { data: reservations } = useParkReservations(parkId);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
    }
  }, [user?.id, user?.name, user?.phone]); // eslint-disable-line react-hooks/exhaustive-deps

  const theirs = useMemo(() => reservations.filter((r) => r.userId === route.params.uid), [reservations, route.params.uid]);

  if (loading) return <Loading />;
  if (!user) return <EmptyState title="Conta não encontrada" />;
  const canEdit = me.role === 'admin' || user.role === 'utente';

  const run = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try {
      await fn();
      Alert.alert('Concluído', done);
    } catch (e) {
      Alert.alert('Erro', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const changeStatus = (status: AccountStatus, label: string) =>
    run(
      status,
      async () => {
        await setUserStatus(user.id, status);
        if (status === 'ativo') sendPushToUser(user.id, 'Conta validada', 'Já pode fazer reservas no ParkSmart.').catch(() => {});
      },
      label,
    );

  return (
    <Screen>
      <View style={styles.header}>
        <Avatar uri={user.photoURL} name={user.name} size={80} />
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.muted}>
          {user.role === 'utente' ? 'Utente' : user.role === 'gestor' ? 'Segurança / Gestor' : 'Administrador'} · {user.email}
        </Text>
        <AccountBadge status={user.status} />
      </View>

      {user.status === 'pendente' && <Banner tone="warning" text="Este registo aguarda validação." />}

      <View style={{ gap: spacing.sm }}>
        {user.status !== 'ativo' && canEdit && (
          <AppButton title={user.status === 'pendente' ? 'Validar registo' : 'Reativar conta'} variant="success" icon="checkmark-done-outline" loading={busy === 'ativo'} onPress={() => changeStatus('ativo', 'Conta ativa.')} />
        )}
        {user.status !== 'bloqueado' && canEdit && user.id !== me.id && (
          <AppButton title={user.status === 'pendente' ? 'Rejeitar' : 'Bloquear conta'} variant="danger" icon="ban-outline" loading={busy === 'bloqueado'} onPress={() => changeStatus('bloqueado', 'Conta bloqueada.')} />
        )}
      </View>

      {canEdit && (
        <Card title="Editar perfil">
          <TextField label="Nome" value={name} onChangeText={setName} />
          <TextField label="Telemóvel" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <AppButton
            title="Guardar"
            icon="save-outline"
            loading={busy === 'save'}
            onPress={() => run('save', () => updateUserByStaff(user.id, { name: name.trim(), phone: phone.trim() }), 'Perfil atualizado.')}
          />
        </Card>
      )}

      {user.role === 'utente' && (
        <Card title="Atividade neste parque">
          <InfoRow label="Reservas" value={String(theirs.length)} />
          <InfoRow label="Total pago" value={formatMoney(theirs.reduce((s, r) => s + totalPaid(r.payments), 0))} />
          <InfoRow label="Veículos" value={(user.vehicles ?? []).map((v) => v.plate).join(', ') || '—'} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.sm },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  muted: { color: colors.textMuted },
});
