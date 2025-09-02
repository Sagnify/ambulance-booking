import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface HospitalSearchProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  searchRadius: number;
  onRadiusPress: () => void;
  showRadiusControl: boolean;
  onRadiusChange: (radius: number) => void;
}

const HospitalSearch: React.FC<HospitalSearchProps> = ({
  searchText,
  onSearchChange,
  searchRadius,
  onRadiusPress,
  showRadiusControl,
  onRadiusChange,
}) => {
  const { colors, isDarkMode } = useTheme();

  return (
    <View>
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.text }]}
          placeholder="Search hospitals nearby..."
          placeholderTextColor={colors.textSecondary}
          value={searchText}
          onChangeText={onSearchChange}
        />
        <TouchableOpacity 
          style={[styles.radiusSelector, { backgroundColor: colors.surface }]}
          onPress={onRadiusPress}
        >
          <Text style={[styles.radiusText, { color: colors.text }]}>{searchRadius}km</Text>
          <Text style={[styles.radiusArrow, { color: colors.textSecondary }]}>▼</Text>
        </TouchableOpacity>
      </View>
      
      {showRadiusControl && (
        <View style={styles.radiusOptions}>
          {[2, 5, 10, 15, 20].map((radius) => (
            <TouchableOpacity
              key={radius}
              style={[
                styles.radiusOption, 
                { backgroundColor: searchRadius === radius ? colors.primary : colors.surface }
              ]}
              onPress={() => onRadiusChange(radius)}
            >
              <Text style={[
                styles.radiusOptionText, 
                { color: searchRadius === radius ? (isDarkMode ? colors.background : '#fff') : colors.textSecondary }
              ]}>
                {radius}km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  radiusSelector: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  },
  radiusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  radiusArrow: {
    fontSize: 10,
  },
  radiusOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  radiusOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  radiusOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default HospitalSearch;