import React, { useState, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const { session } = useAuth();

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', color: '#fff', marginBottom: 20 }}>
          We need your permission to show the camera
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.text}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function takePicture() {
    if (!cameraRef.current) return;

    setLoading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      
      // Pass to real Gemini AI service
      const aiResult = await analyzeFoodWithGemini(photo?.base64 || '');

      // Save to Supabase
      const { error } = await supabase.from('nutrition_logs').insert({
        user_id: session?.user.id,
        food_name: aiResult.food_name,
        calories: Math.round(aiResult.calories || 0),
        protein: Math.round(aiResult.protein || 0),
        carbs: Math.round(aiResult.carbs || 0),
        fat: Math.round(aiResult.fat || 0),
      });

      if (error) throw error;
      
      Alert.alert('Success!', `Logged ${aiResult.food_name} (${aiResult.calories} kcal)`);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to process image');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back" ref={cameraRef} />
      
      {/* Overlays using absolute positioning */}
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>Cancel</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity style={styles.captureButton} onPress={takePicture} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <View style={styles.innerCircle} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

async function analyzeFoodWithGemini(base64Image: string) {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('Please set your EXPO_PUBLIC_GEMINI_API_KEY in the .env file');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Using the absolute latest model since older models are deprecated
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

  const prompt = `Analyze this food image. Provide the nutritional breakdown in strict JSON format with exactly these keys and no markdown or extra text:
{
  "food_name": "Name of the food",
  "calories": number (estimated total calories),
  "protein": number (estimated total protein in grams),
  "carbs": number (estimated total carbs in grams),
  "fat": number (estimated total fat in grams)
}`;

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: 'image/jpeg'
    },
  };

  const result = await model.generateContent([prompt, imagePart]);
  const text = result.response.text();
  
  // Clean up any potential markdown formatting from the response
  const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonStr) as { food_name: string, calories: number, protein: number, carbs: number, fat: number };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  backButton: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 40,
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
