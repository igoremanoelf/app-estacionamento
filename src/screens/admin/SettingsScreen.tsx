import { useNavigation } from '@react-navigation/native';
import { AppButton } from '../../components/AppButton';
import { ListItem, SectionTitle } from '../../components/Misc';
import { Screen } from '../../components/Screen';
import { useCurrentPark } from '../../context/ParkContext';
import { logout } from '../../services/auth';

/** Menu de gestão do administrador. */
export function SettingsScreen() {
  const navigation = useNavigation();
  const { park } = useCurrentPark();
  return (
    <Screen>
      <SectionTitle>{park?.name ?? 'Parque'}</SectionTitle>
      <ListItem icon="business-outline" title="Configurar parque" subtitle="Nome, horário e lugares" onPress={() => navigation.navigate('ParkSettings')} />
      <ListItem icon="pricetags-outline" title="Preços" subtitle="Preço por hora e avenças mensais" onPress={() => navigation.navigate('Prices')} />
      <ListItem icon="car-outline" title="Veículos" subtitle="Todos os veículos que usaram o parque" onPress={() => navigation.navigate('Vehicles')} />
      <ListItem icon="archive-outline" title="Histórico de reservas" subtitle="Reset do histórico" onPress={() => navigation.navigate('ResetHistory')} />
      <SectionTitle>Operação</SectionTitle>
      <ListItem icon="qr-code-outline" title="Ler QR Code" subtitle="Registar entradas e saídas" onPress={() => navigation.navigate('ScanGate')} />
      <ListItem icon="warning-outline" title="Alertas" onPress={() => navigation.navigate('Alerts')} />
      <ListItem icon="stats-chart-outline" title="Estatísticas" onPress={() => navigation.navigate('Stats')} />
      <SectionTitle>Conta</SectionTitle>
      <ListItem icon="person-outline" title="O meu perfil" onPress={() => navigation.navigate('MyProfile')} />
      <AppButton title="Terminar sessão" variant="danger" icon="log-out-outline" onPress={logout} />
    </Screen>
  );
}
