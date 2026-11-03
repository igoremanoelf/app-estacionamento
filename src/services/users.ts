import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { firebaseStorage, useStorageForPhotos as storageEnabled } from '../config/firebase';
import { authBackend } from '../data/auth';
import { arrayRemove, arrayUnion, serverTimestamp, setDoc, updateDoc } from '../data/db';
import { isLocalMode } from '../data/mode';
import type { AccountStatus, Role, UserProfile, UserVehicle } from '../types';
import { refs } from './firestore';

export async function updateUserProfile(uid: string, data: Partial<Pick<UserProfile, 'name' | 'phone' | 'photoURL'>>): Promise<void> {
  await updateDoc(refs.user(uid), data);
}

/** RFG2/RFA2: alterações feitas por gestores/administradores. */
export async function updateUserByStaff(
  uid: string,
  data: Partial<Pick<UserProfile, 'name' | 'phone' | 'status' | 'parkId'>>,
): Promise<void> {
  await updateDoc(refs.user(uid), data);
}

export async function setUserStatus(uid: string, status: AccountStatus): Promise<void> {
  await updateDoc(refs.user(uid), { status });
}

export async function addUserVehicle(uid: string, v: UserVehicle): Promise<void> {
  await updateDoc(refs.user(uid), { vehicles: arrayUnion(v) });
}

export async function removeUserVehicle(uid: string, v: UserVehicle): Promise<void> {
  await updateDoc(refs.user(uid), { vehicles: arrayRemove(v) });
}

/**
 * RFG0/RFA2: o administrador cria contas de gestores (ou utentes) já ativas.
 * No Firebase usa uma instância secundária do Auth para não perder a sessão atual.
 */
export async function createAccountByAdmin(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Exclude<Role, 'admin'>;
  parkId: string;
}): Promise<void> {
  const user = await authBackend.createAccount(data.email.trim(), data.password);
  await setDoc(refs.user(user.uid), {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone.trim(),
    photoURL: null,
    role: data.role,
    status: 'ativo',
    parkId: data.parkId,
    vehicles: [],
    createdAt: serverTimestamp(),
  });
}

/** No modo local a foto fica sempre no próprio documento (base64). */
const useStorageForPhotos = storageEnabled && !isLocalMode;

/**
 * Upload da foto de perfil. Usa o Firebase Storage quando configurado
 * (EXPO_PUBLIC_USE_STORAGE=true); caso contrário guarda uma versão pequena
 * em base64 no próprio documento (o Storage exige o plano Blaze).
 */
export async function pickAndUploadPhoto(uid: string): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('É necessário permitir o acesso às fotos.');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: useStorageForPhotos ? 0.6 : 0.15,
    base64: !useStorageForPhotos,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  let url: string;
  if (useStorageForPhotos) {
    const blob = await (await fetch(asset.uri)).blob();
    const fileRef = ref(firebaseStorage(), `avatars/${uid}.jpg`);
    await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
    url = await getDownloadURL(fileRef);
  } else {
    if (!asset.base64) throw new Error('Não foi possível ler a imagem.');
    if (asset.base64.length > 700_000) throw new Error('Imagem demasiado grande. Escolha outra ou recorte-a.');
    url = `data:image/jpeg;base64,${asset.base64}`;
  }
  await updateUserProfile(uid, { photoURL: url });
  return url;
}
