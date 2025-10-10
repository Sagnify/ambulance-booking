import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface Hospital {
  id: string;
  name: string;
  distance: string;
  type: string;
  emergency_services: boolean;
}

interface HospitalListProps {
  hospitals: Hospital[];
  selectedHospitalId?: string;
  searchRadius: number;
  onHospitalSelect: (hospital: Hospital) => void;
}

const HospitalList: React.FC<HospitalListProps> = ({
  hospitals,
  selectedHospitalId,
  searchRadius,
  onHospitalSelect,
}) => {
  const { colors } = useTheme();
  const { translateHospitalName, currentLanguage, t } = useLanguage();
  const [translatedHospitals, setTranslatedHospitals] = useState<Hospital[]>([]);

  useEffect(() => {
    translateHospitals();
  }, [hospitals, currentLanguage]);

  const translateHospitals = async () => {
    const translated = await Promise.all(
      hospitals.map(async (hospital) => ({
        ...hospital,
        name: await translateHospitalName(hospital.name),
        distance: hospital.distance + ' ' + (currentLanguage === 'en' ? 'km' : 
          currentLanguage === 'hi' ? 'किमी' :
          currentLanguage === 'bn' ? 'কিমি' :
          currentLanguage === 'ta' ? 'கிமீ' :
          currentLanguage === 'te' ? 'కిమీ' :
          currentLanguage === 'gu' ? 'કિમી' : 'km')
      }))
    );
    setTranslatedHospitals(translated);
  };

  return (
    <ScrollView style={styles.hospitalList} showsVerticalScrollIndicator={false}>
      {translatedHospitals.length > 0 ? (
        translatedHospitals.map((hospital, index) => (
          <TouchableOpacity 
            key={hospital.id || index} 
            style={[
              styles.hospitalItem,
              { backgroundColor: colors.background, borderColor: colors.border },
              selectedHospitalId === hospital.id && { borderColor: colors.primary, backgroundColor: colors.surface }
            ]}
            onPress={() => onHospitalSelect(hospital)}
          >
            <View style={styles.hospitalHeader}>
              <Text style={[styles.hospitalName, { color: colors.text }]}>{hospital.name}</Text>
              <Text style={[styles.hospitalDistance, { color: colors.textSecondary }]}>{hospital.distance}</Text>
            </View>
            <Text style={[styles.hospitalType, { color: '#007AFF' }]}>{hospital.type}</Text>
            <Text style={[styles.hospitalServices, { color: colors.textSecondary }]}>
              {t('emergency')}: {hospital.emergency_services ? t('available') : t('notAvailable')}
            </Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={[styles.noHospitalsText, { color: colors.textSecondary }]}>
          {t('noHospitalsFound')} {searchRadius}{currentLanguage === 'en' ? 'km' : 
            currentLanguage === 'hi' ? 'किमी' :
            currentLanguage === 'bn' ? 'কিমি' :
            currentLanguage === 'ta' ? 'கிமீ' :
            currentLanguage === 'te' ? 'కిమీ' :
            currentLanguage === 'gu' ? 'કિમી' : 'km'} {t('radius')}
        </Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  hospitalList: {
    flex: 1,
    paddingVertical: 8,
  },
  hospitalItem: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  hospitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  hospitalDistance: {
    fontSize: 14,
  },
  hospitalType: {
    fontSize: 12,
    color: '#007AFF',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  hospitalServices: {
    fontSize: 12,
    marginTop: 2,
  },
  noHospitalsText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default HospitalList;