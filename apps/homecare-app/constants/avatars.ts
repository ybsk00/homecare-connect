/**
 * 아바타 이미지 (React Native require)
 */
export const Avatars = {
  nurse: require('../assets/images/nurse.jpg'),
  patientMale: require('../assets/images/patient_man.jpg'),
  patientFemale: require('../assets/images/patient_women.jpg'),
};

/**
 * 성별에 따른 환자 아바타 반환
 */
export function getPatientAvatar(gender?: string | null) {
  return gender === 'male' ? Avatars.patientMale : Avatars.patientFemale;
}
