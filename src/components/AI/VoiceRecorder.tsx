import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Square, Loader } from 'lucide-react';

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onTranscript, disabled = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      
      // Configure speech recognition
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onstart = () => {
        setIsRecording(true);
        setIsProcessing(false);
      };

      recognitionRef.current.onresult = (event: any) => {
        setIsProcessing(true);
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
        setTimeout(() => {
          setIsRecording(false);
          setIsProcessing(false);
        }, 500);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setIsProcessing(false);
      };

      recognitionRef.current.onend = () => {
        if (!isProcessing) {
          setIsRecording(false);
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript]);

  const startRecording = () => {
    if (recognitionRef.current && !isRecording) {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="text-xs text-gray-500 text-center p-2">
        Voice input not supported
      </div>
    );
  }

  return (
    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled}
        className={`p-2 rounded-full transition-all duration-300 ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-md'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:shadow-sm'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title={isRecording ? 'Stop recording' : 'Start voice recording'}
      >
        {isProcessing ? (
          <Loader className="h-5 w-5 animate-spin" />
        ) : isRecording ? (
          <Square className="h-4 w-4" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </button>
      {isRecording && (
        <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-red-600 animate-pulse bg-white px-2 py-0.5 rounded-md shadow-sm whitespace-nowrap">
          Recording...
        </span>
      )}
    </div>
  );
}