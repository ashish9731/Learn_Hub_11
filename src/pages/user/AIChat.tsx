import React, { useState, useEffect } from 'react';
import { Bot, Send, User, Lightbulb, BookOpen, Target, TrendingUp, MessageCircle, AlertCircle, Download, Sparkles, Brain, Zap, Rocket, Bookmark, Award, ChevronRight } from 'lucide-react';
import { kaayaAI } from '../../services/openai';
import UserProfileForm from '../../components/AI/UserProfileForm';
import VoiceRecorder from '../../components/AI/VoiceRecorder';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useProfile } from '../../hooks/useProfile';

interface AIChatProps {
  userEmail?: string;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface UserProfile {
  name: string;
  companyName: string;
  designation: string;
  profileDescription: string;
  learningGoals: string;
  interestedTech: string[];
}

export default function AIChat({ userEmail = '' }: AIChatProps) {
  const [userProfiles, setUserProfiles] = useLocalStorage('userProfiles', {});
  const [chatSessions, setChatSessions] = useLocalStorage('chatSessions', {});
  const { profile } = useProfile();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [remainingWords, setRemainingWords] = useState(200);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [learningPath, setLearningPath] = useState<any[]>([]);
  const [learningStats, setLearningStats] = useState({
    totalInteractions: 0,
    topicsExplored: 0,
    learningStreak: 0,
    lastInteraction: null
  });

  const userId = userEmail;
  const userProfile = userProfiles[userId];

  useEffect(() => {
    // Check if user has a profile
    if (!userProfile) {
      setShowProfileForm(true);
    } else {
      initializeSession();
    }
  }, [userProfile]);

  useEffect(() => {
    // Generate some sample learning path data
    if (userProfile) {
      const samplePath = [
        {
          id: 1,
          title: "Foundations of " + userProfile.interestedTech[0],
          progress: 75,
          type: "course",
          icon: <BookOpen className="h-5 w-5 text-blue-500" />
        },
        {
          id: 2,
          title: "Advanced " + (userProfile.interestedTech[1] || userProfile.interestedTech[0]),
          progress: 45,
          type: "project",
          icon: <Rocket className="h-5 w-5 text-purple-500" />
        },
        {
          id: 3,
          title: "Career Growth in " + userProfile.designation,
          progress: 20,
          type: "skill",
          icon: <TrendingUp className="h-5 w-5 text-green-500" />
        }
      ];
      setLearningPath(samplePath);
      
      // Set some sample learning stats
      const stats = {
        totalInteractions: messages.length,
        topicsExplored: Math.min(userProfile.interestedTech.length, 5),
        learningStreak: Math.floor(Math.random() * 7) + 1,
        lastInteraction: new Date().toISOString()
      };
      setLearningStats(stats);
    }
  }, [userProfile, messages.length]);

  const initializeSession = async () => {
    if (!userProfile) return;

    try {
      await kaayaAI.initializeSession(userId, userProfile);
      
      // Load existing messages from localStorage
      const savedSession = chatSessions[userId];
      if (savedSession && savedSession.messages) {
        setMessages(savedSession.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      } else {
        // Welcome message
        const welcomeMessage: Message = {
          id: '1',
          type: 'ai',
          content: `Hello ${userProfile.name}! 👋 I'm Kaaya, your personalized AI learning assistant.\n\nBased on your profile as a ${userProfile.designation} interested in ${userProfile.interestedTech.slice(0, 3).join(', ')}, I'm here to help you create a customized learning path!\n\n🎯 I can help you with:\n• Personalized learning roadmaps\n• Technology-specific skill development\n• Career advancement strategies\n• Resource recommendations\n\nWhat would you like to focus on in your learning journey today?`,
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      }

      setRemainingWords(kaayaAI.getRemainingWords(userId));
      setSessionInitialized(true);
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  };

  const handleProfileSubmit = async (profile: UserProfile) => {
    setUserProfiles(prev => ({
      ...prev,
      [userId]: {
        ...profile,
        interestedTech: profile.learningGoals.split(',').map(item => item.trim())
      }
    }));
    setShowProfileForm(false);
    
    // Initialize session with new profile
    setTimeout(() => {
      initializeSession();
    }, 100);
  };

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage;
    if (!textToSend.trim() || !sessionInitialized) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await kaayaAI.sendMessage(userId, textToSend);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response,
        timestamp: new Date()
      };

      const finalMessages = [...newMessages, aiMessage];
      setMessages(finalMessages);
      
      // Save to localStorage
      setChatSessions(prev => ({
        ...prev,
        [userId]: {
          ...prev[userId],
          messages: finalMessages
        }
      }));

      setRemainingWords(kaayaAI.getRemainingWords(userId));
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I'm sorry, I'm having trouble connecting right now. Please check your internet connection and try again.",
        timestamp: new Date()
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    setInputMessage(transcript);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const downloadLearningPath = () => {
    if (!userProfile || messages.length === 0) return;

    // Filter AI messages that contain learning recommendations
    const learningMessages = messages.filter(msg => 
      msg.type === 'ai' && 
      (msg.content.toLowerCase().includes('learning') || 
       msg.content.toLowerCase().includes('roadmap') ||
       msg.content.toLowerCase().includes('skill') ||
       msg.content.toLowerCase().includes('course') ||
       msg.content.toLowerCase().includes('recommend'))
    );

    if (learningMessages.length === 0) {
      alert('No learning path recommendations found. Please ask Kaaya for learning guidance first!');
      return;
    }

    // Create the content for the text file
    const content = `
PERSONALIZED LEARNING PATH
Generated by Kaaya AI Assistant
Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}

═══════════════════════════════════════════════════════════════

USER PROFILE:
═══════════════════════════════════════════════════════════════
Name: ${userProfile.name}
Company: ${userProfile.companyName}
Current Role: ${userProfile.designation}
Profile Description: ${userProfile.profileDescription}
Technology Interests: ${userProfile.interestedTech.join(', ')}

═══════════════════════════════════════════════════════════════

PERSONALIZED LEARNING RECOMMENDATIONS:
═══════════════════════════════════════════════════════════════

${learningMessages.map((msg, index) => `
${index + 1}. RECOMMENDATION (${msg.timestamp.toLocaleDateString()} at ${msg.timestamp.toLocaleTimeString()}):
${'-'.repeat(60)}
${msg.content}

`).join('')}

═══════════════════════════════════════════════════════════════

COMPLETE CONVERSATION HISTORY:
═══════════════════════════════════════════════════════════════

${messages.map((msg, index) => `
${msg.type === 'user' ? '👤 YOU' : '🤖 KAAYA'} (${msg.timestamp.toLocaleDateString()} at ${msg.timestamp.toLocaleTimeString()}):
${'-'.repeat(60)}
${msg.content}

`).join('')}

═══════════════════════════════════════════════════════════════

NEXT STEPS:
═══════════════════════════════════════════════════════════════
✅ Review the personalized recommendations above
✅ Start with the highest priority skills for your role
✅ Set up a learning schedule based on your availability
✅ Track your progress and return to Kaaya for updates
✅ Apply new skills in real projects at ${userProfile.companyName}

═══════════════════════════════════════════════════════════════

Generated by Kaaya AI Learning Assistant
Your personalized learning companion for ${userProfile.designation} role
Focus Areas: ${userProfile.interestedTech.slice(0, 5).join(', ')}

Happy Learning! 🚀📚
    `.trim();

    // Create and download the file
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const fileName = `${userProfile.name.replace(/\s+/g, '_')}_Learning_Path_${new Date().toISOString().split('T')[0]}.txt`;
    link.href = url;
    link.download = fileName;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Show success message
    alert(`✅ Learning path downloaded successfully!\n\nFile: ${fileName}\n\nYour personalized learning recommendations from Kaaya have been saved to your device.`);
  };

  const quickSuggestions = [
    { text: "Create a learning roadmap for my role", icon: <Target className="h-4 w-4" /> },
    { text: "What skills should I focus on next?", icon: <Lightbulb className="h-4 w-4" /> },
    { text: "Recommend courses for my interests", icon: <BookOpen className="h-4 w-4" /> },
    { text: "How can I advance in my career?", icon: <TrendingUp className="h-4 w-4" /> }
  ];

  if (showProfileForm) {
    return (
      <div className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">AI Chat Personalized Learning</h1>
            <p className="mt-1 text-sm text-gray-500">
              Complete your profile to start your personalized learning session with Kaaya
            </p>
          </div>
          <UserProfileForm 
            onSubmit={handleProfileSubmit}
            initialData={userProfile}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">AI Chat Personalized Learning</h1>
                  <p className="text-blue-100">
                    Your personalized AI learning assistant tailored to your career goals
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm">
                  <div className="text-sm">
                    Daily words: <span className="font-semibold text-blue-200">{remainingWords}/200</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-1.5 mt-1">
                    <div className="bg-blue-300 h-1.5 rounded-full" style={{ width: `${(remainingWords/200)*100}%` }}></div>
                  </div>
                </div>
                <button
                  onClick={() => setShowProfileForm(true)}
                  className="bg-white/10 hover:bg-white/20 transition-colors px-3 py-2 rounded-lg text-sm font-medium backdrop-blur-sm"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 flex space-x-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'chat' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center">
                <Bot className="h-4 w-4 mr-2" />
                AI Chat
              </div>
            </button>
            <button
              onClick={() => setActiveTab('learning-path')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'learning-path' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center">
                <Rocket className="h-4 w-4 mr-2" />
                Learning Path
              </div>
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'insights' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center">
                <Sparkles className="h-4 w-4 mr-2" />
                Insights
              </div>
            </button>
          </div>
        </div>

        {remainingWords === 0 && (
          <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-orange-800">Daily Limit Reached</h3>
                <p className="text-sm text-orange-700">
                  You've used all 200 words for today. Come back tomorrow for more personalized learning guidance!
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar with Quick Actions */}
            <div className="lg:col-span-1">
              <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
                  Quick Questions
                </h3>
                <div className="space-y-3">
                  {[
                    { text: "What's my personalized learning path?", icon: Target, color: "bg-blue-100 text-blue-700 hover:bg-blue-200" },
                    { text: "Which technologies should I learn next?", icon: BookOpen, color: "bg-green-100 text-green-700 hover:bg-green-200" },
                    { text: "How can I advance in my current role?", icon: TrendingUp, color: "bg-purple-100 text-purple-700 hover:bg-purple-200" },
                    { text: "Recommend courses for my interests", icon: MessageCircle, color: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" },
                    { text: "Create a 30-day learning plan", icon: Lightbulb, color: "bg-pink-100 text-pink-700 hover:bg-pink-200" },
                    { text: "What skills are trending in my field?", icon: Zap, color: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200" }
                  ].map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(item.text)}
                      disabled={remainingWords === 0}
                      className={`w-full text-left p-4 text-sm rounded-xl transition-all duration-200 shadow-sm hover:shadow ${item.color} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-start">
                        <item.icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <span className="ml-3 leading-relaxed">{item.text}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 text-blue-500 mr-2" />
                  Your Profile
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                      {userProfile?.name.charAt(0) || profile?.first_name?.charAt(0) || "U"}
                    </div>
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">{userProfile?.name}</div>
                      <div className="text-sm text-gray-500">{userProfile?.designation}</div>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-100">
                    <div className="text-sm font-medium text-gray-700">Company</div>
                    <div className="text-sm text-gray-600">{userProfile?.companyName}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-700">Learning Goals</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {userProfile?.interestedTech?.map((tech: string) => (
                        <span key={tech} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-100 to-blue-100 shadow-lg rounded-xl border border-green-200 p-6">
                <div className="flex items-center mb-3">
                  <Download className="h-5 w-5 text-green-600 mr-2" />
                  <h4 className="text-base font-medium text-green-800">Learning Path Export</h4>
                </div>
                <p className="text-sm text-green-700 mb-4">
                  Save your personalized learning recommendations as a text file to your device!
                </p>
                <button
                  onClick={downloadLearningPath}
                  disabled={messages.length <= 1}
                  className="w-full flex items-center justify-center text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {messages.length <= 1 ? 'Chat with Kaaya first' : 'Download Learning Path'}
                </button>
              </div>
            </div>

            {/* Chat Interface */}
            <div className="lg:col-span-3">
              <div className="bg-white shadow-lg rounded-xl border border-gray-200 flex flex-col h-[700px]">
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-white/20 rounded-full p-2 mr-3 backdrop-blur-sm">
                        <Bot className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-white">Kaaya - AI Learning Assistant</h3>
                        <p className="text-sm text-blue-100">Personalized for {userProfile?.designation}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="bg-white/10 rounded-lg px-3 py-1 backdrop-blur-sm">
                        <div className="text-xs text-blue-100">Words left</div>
                        <div className="text-sm font-semibold text-white">{remainingWords}/200</div>
                      </div>
                      <button
                        onClick={downloadLearningPath}
                        disabled={messages.length <= 1}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-lg text-indigo-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Download your personalized learning path"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Export
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex max-w-xs lg:max-w-md xl:max-w-lg ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`flex-shrink-0 ${message.type === 'user' ? 'ml-3' : 'mr-3'}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            message.type === 'user' 
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-md' 
                              : 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md'
                          }`}>
                            {message.type === 'user' ? (
                              <User className="h-5 w-5 text-white" />
                            ) : (
                              <Bot className="h-5 w-5 text-white" />
                            )}
                          </div>
                        </div>
                        <div
                          className={`px-5 py-4 rounded-2xl shadow-sm ${
                            message.type === 'user'
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                              : 'bg-white text-gray-800 border border-gray-100'
                          }`}
                        >
                          <div className="text-sm whitespace-pre-line leading-relaxed">{message.content}</div>
                          <div className={`text-xs mt-2 ${
                            message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex mr-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                          <Bot className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="bg-white px-5 py-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Suggestions */}
                {messages.length === 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 bg-white">
                    <p className="text-sm font-medium text-gray-700 mb-3">Quick suggestions:</p>
                    <div className="flex flex-wrap gap-2">
                      {quickSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSendMessage(suggestion.text)}
                          disabled={remainingWords === 0}
                          className="px-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm"
                        >
                          {suggestion.icon}
                          <span className="ml-2">{suggestion.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="px-6 py-4 border-t border-gray-200 bg-white rounded-b-xl">
                  <div className="flex space-x-3">
                    <div className="flex-1 relative">
                      <textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={remainingWords === 0 ? "Daily limit reached. Come back tomorrow!" : "Ask Kaaya about your personalized learning path..."}
                        className="block w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        rows={2}
                        disabled={remainingWords === 0}
                      />
                      <VoiceRecorder 
                        onTranscript={handleVoiceTranscript}
                        disabled={remainingWords === 0 || isTyping}
                      />
                    </div>
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!inputMessage.trim() || isTyping || remainingWords === 0}
                      className="inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm w-14"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'learning-path' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                  <Rocket className="h-5 w-5 text-blue-500 mr-2" />
                  Your Personalized Learning Path
                </h3>
                
                <div className="space-y-6">
                  {learningPath.map((item, index) => (
                    <div key={item.id} className="relative">
                      {index < learningPath.length - 1 && (
                        <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-gray-200 z-0"></div>
                      )}
                      <div className="relative z-10 flex items-start">
                        <div className="flex-shrink-0 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center border-4 border-white shadow-md">
                          {item.icon}
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-base font-medium text-gray-900">{item.title}</h4>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                item.type === 'course' ? 'bg-blue-100 text-blue-800' :
                                item.type === 'project' ? 'bg-purple-100 text-purple-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {item.type === 'course' ? 'Course' : 
                                 item.type === 'project' ? 'Project' : 'Skill'}
                              </span>
                            </div>
                            <div className="mb-3">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Progress</span>
                                <span>{item.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    item.type === 'course' ? 'bg-blue-600' :
                                    item.type === 'project' ? 'bg-purple-600' :
                                    'bg-green-600'
                                  }`}
                                  style={{ width: `${item.progress}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">
                                {item.progress < 100 ? 'In progress' : 'Completed'}
                              </span>
                              <button className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center">
                                Continue
                                <ChevronRight className="h-3 w-3 ml-1" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="relative z-10 flex items-start">
                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center border-4 border-white shadow-md">
                      <Sparkles className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm border-dashed">
                        <div className="text-center py-2">
                          <p className="text-sm text-gray-500">Continue chatting with Kaaya to unlock more personalized learning recommendations</p>
                          <button 
                            onClick={() => setActiveTab('chat')}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Chat with Kaaya
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-1">
              <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Award className="h-5 w-5 text-yellow-500 mr-2" />
                  Learning Stats
                </h3>
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-blue-700">Total Interactions</div>
                      <div className="text-xl font-bold text-blue-800">{learningStats.totalInteractions}</div>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-green-700">Topics Explored</div>
                      <div className="text-xl font-bold text-green-800">{learningStats.topicsExplored}</div>
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-purple-700">Learning Streak</div>
                      <div className="text-xl font-bold text-purple-800">{learningStats.learningStreak} days</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Bookmark className="h-5 w-5 text-indigo-500 mr-2" />
                  Saved Resources
                </h3>
                <div className="space-y-3">
                  {messages.length > 2 ? (
                    <div className="space-y-3">
                      <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center">
                          <BookOpen className="h-4 w-4 text-blue-500 mr-2" />
                          <span className="text-sm font-medium text-gray-800">Learning Roadmap</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Personalized career path based on your profile</p>
                      </div>
                      <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center">
                          <Rocket className="h-4 w-4 text-purple-500 mr-2" />
                          <span className="text-sm font-medium text-gray-800">Skill Development Plan</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Top skills to focus on for your role</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-gray-500">
                      <p>No saved resources yet</p>
                      <p className="text-xs mt-1">Chat with Kaaya to get personalized recommendations</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'insights' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                <Sparkles className="h-5 w-5 text-purple-500 mr-2" />
                Learning Insights
              </h3>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                  <h4 className="text-base font-medium text-blue-800 mb-2">Your Learning Style</h4>
                  <p className="text-sm text-blue-700">Based on your interactions, you learn best through practical, hands-on projects with clear applications to your work as a {userProfile?.designation}.</p>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4 border border-green-100">
                  <h4 className="text-base font-medium text-green-800 mb-2">Recommended Focus Areas</h4>
                  <div className="space-y-2">
                    {userProfile?.interestedTech?.slice(0, 3).map((tech: string, index: number) => (
                      <div key={index} className="flex items-center">
                        <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                        <span className="text-sm text-green-700">{tech}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                  <h4 className="text-base font-medium text-purple-800 mb-2">Career Growth Potential</h4>
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="h-2 bg-gray-200 rounded-full">
                        <div className="h-2 bg-purple-500 rounded-full" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                    <span className="ml-3 text-sm font-medium text-purple-700">65%</span>
                  </div>
                  <p className="text-xs text-purple-600 mt-2">Continue learning to unlock your full potential</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                <Award className="h-5 w-5 text-yellow-500 mr-2" />
                Learning Achievements
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Rocket className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">Getting Started</h4>
                    <p className="text-xs text-gray-500">Completed your learning profile</p>
                  </div>
                  <div className="ml-auto">
                    <div className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Completed</div>
                  </div>
                </div>
                
                {messages.length > 5 ? (
                  <div className="flex items-center p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-900">Active Learner</h4>
                      <p className="text-xs text-gray-500">Had 5+ meaningful learning conversations</p>
                    </div>
                    <div className="ml-auto">
                      <div className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Completed</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-900">Active Learner</h4>
                      <p className="text-xs text-gray-500">Have 5+ meaningful learning conversations</p>
                    </div>
                    <div className="ml-auto">
                      <div className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {messages.length}/5
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Download className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">Learning Exporter</h4>
                    <p className="text-xs text-gray-500">Download your first learning path</p>
                  </div>
                  <div className="ml-auto">
                    <div className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Locked</div>
                  </div>
                </div>
                
                <div className="flex items-center p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Award className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">Learning Streak</h4>
                    <p className="text-xs text-gray-500">Use Kaaya for 7 consecutive days</p>
                  </div>
                  <div className="ml-auto">
                    <div className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {learningStats.learningStreak}/7
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}