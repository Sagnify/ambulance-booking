import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';

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
  const [vibrationInterval, setVibrationInterval] = useState<NodeJS.Timeout | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const thumbWidth = 52;
  const padding = 4;
  const maxSlide = Math.max(0, containerWidth - thumbWidth - (padding * 2));

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
    
    // Cleanup vibration on unmount
    return () => {
      if (vibrationInterval) {
        clearInterval(vibrationInterval);
      }
    };
  }, []);

  const onGestureEvent = (event: any) => {
    if (maxSlide <= 0) return; // Wait for layout
    
    const { translationX } = event.nativeEvent;
    const clampedX = Math.max(0, Math.min(maxSlide, translationX));
    
    // Stop hint animation when user starts sliding
    if (translationX > 0) {
      slideHintAnim.stopAnimation();
      slideHintAnim.setValue(0);
    }
    
    translateX.setValue(clampedX);
    
    // Start continuous vibration when sliding starts
    if (clampedX > 5 && !vibrationInterval) {
      const interval = setInterval(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 100);
      setVibrationInterval(interval);
    }
    
    if (clampedX > maxSlide * 0.5 && !isCompleting) {
      setIsSliding(true);
      setIsCompleting(true);
    } else if (clampedX <= maxSlide * 0.5) {
      setIsSliding(false);
    }
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === 4) {
      // Stop vibration when gesture ends
      if (vibrationInterval) {
        clearInterval(vibrationInterval);
        setVibrationInterval(null);
      }
      
      const { translationX } = event.nativeEvent;
      
      if (translationX > maxSlide * 0.5 || isCompleting) {
        // Auto-complete when reaching 80%
        Animated.timing(translateX, {
          toValue: maxSlide,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          setIsCompleting(false);
          onSlideComplete();
        });
        return;
      } else {
        // Reset to start smoothly and restart hint animation
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: false,
          tension: 120,
          friction: 10,
        }).start(() => {
          // Restart hint animation after reset
          slideHint();
        });
        setIsSliding(false);
        setIsCompleting(false);
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
    <Animated.View 
      style={[styles.sliderContainer, { backgroundColor: colors.primary, transform: [{ scale: scaleAnim }] }]}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
      }}
    >
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
              backgroundColor: isSliding ? colors.surface : colors.background,
              left: padding
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