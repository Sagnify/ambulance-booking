import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useTheme } from '../../context/ThemeContext';

interface SlideToBookProps {
  onSlideComplete: () => void;
  hospitalName: string;
}

const SlideToBook: React.FC<SlideToBookProps> = ({ onSlideComplete, hospitalName }) => {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const slideHintAnim = useRef(new Animated.Value(0)).current;
  const [isSliding, setIsSliding] = useState(false);
  const sliderWidth = 280;
  const thumbWidth = 52;
  const maxSlide = sliderWidth - thumbWidth - 8;

  useEffect(() => {
    // Pop-in animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start(() => {
      // Start slide hint animation after pop-in
      slideHint();
    });
  }, []);

  const onGestureEvent = (event: any) => {
    const { translationX } = event.nativeEvent;
    const clampedX = Math.max(0, Math.min(maxSlide, translationX));
    
    // Stop hint animation when user starts sliding
    slideHintAnim.stopAnimation();
    slideHintAnim.setValue(0);
    
    translateX.setValue(clampedX);
    
    if (clampedX > maxSlide * 0.8) {
      setIsSliding(true);
    } else {
      setIsSliding(false);
    }
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === 4) {
      const { translationX } = event.nativeEvent;
      
      if (translationX > maxSlide * 0.8) {
        // Complete the slide
        Animated.timing(translateX, {
          toValue: maxSlide,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          onSlideComplete();
        });
      } else {
        // Reset to start and restart hint animation
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: false,
          tension: 100,
          friction: 8,
        }).start(() => {
          // Restart hint animation after reset
          slideHint();
        });
        setIsSliding(false);
      }
    }
  };

  const slideHint = () => {
    Animated.sequence([
      Animated.timing(slideHintAnim, {
        toValue: 30,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(slideHintAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.delay(1500),
    ]).start(() => slideHint());
  };

  return (
    <Animated.View style={[styles.sliderContainer, { backgroundColor: colors.primary, transform: [{ scale: scaleAnim }] }]}>
      <Text style={[styles.sliderText, { color: '#fff' }]}>Slide to book ambulance</Text>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View 
          style={[
            styles.thumb, 
            { 
              transform: [{ translateX: Animated.add(translateX, slideHintAnim) }],
              backgroundColor: isSliding ? colors.surface : colors.background
            }
          ]}
        >
          <Text style={styles.thumbText}>🚑</Text>
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sliderContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 20,
    left: 24,
    right: 24,
    backgroundColor: '#000',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 4,
    zIndex: 2000,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  sliderText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    opacity: 0.8,
  },
  thumb: {
    position: 'absolute',
    width: 52,
    height: 52,
    backgroundColor: '#fff',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    left: 4,
    top: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  thumbText: {
    fontSize: 24,
  },
});

export default SlideToBook;