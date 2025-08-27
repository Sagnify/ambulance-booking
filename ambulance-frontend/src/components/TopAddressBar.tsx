import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Props {
  address: string;
}

const TopAddressBar: React.FC<Props> = ({ address }) => {
  return (
    <View style={styles.container}>
      <Icon name="location-on" size={22} color="#fff" />
      <Text style={styles.address} numberOfLines={1}>{address}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 80,
    backgroundColor: '#1E90FF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
  },
  address: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 6,
    flex: 1,
  },
});

export default TopAddressBar;
