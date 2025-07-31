import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export interface AIChatDrawerProps {
  prompt: string;
  title: string;
  data: any;
  customQuery?: string;
  icon?: React.ReactNode;
}

export interface AIChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface AIChatDrawerState {
  // State
  isOpen: boolean;
  messages: AIChatMessage[];
  input: string;
  loading: boolean;
  drawerProps: AIChatDrawerProps | null;
  initialAnalysis: string;
  isInitialAnalysisComplete: boolean;

  // Actions
  setInput: (input: string) => void;
  openDrawer: (props: AIChatDrawerProps) => Promise<void>;
  closeDrawer: () => void;
  sendMessage: (message: string) => Promise<void>;
  clearChat: () => void;
  getRAGStats: () => Promise<any>;
  clearRAGData: () => Promise<void>;
}

export const useAIChatDrawer = create<AIChatDrawerState>((set, get) => ({
  // Initial state
  isOpen: false,
  messages: [],
  input: '',
  loading: false,
  drawerProps: null,
  initialAnalysis: '',
  isInitialAnalysisComplete: false,

  // Actions
  setInput: (input: string) => set({ input }),

  openDrawer: async (props: AIChatDrawerProps) => {
    set({
      drawerProps: props,
      isOpen: true,
      loading: true,
      initialAnalysis: '',
      isInitialAnalysisComplete: false
    });

    try {
      // Initialize RAG system and ingest data if custom query is provided
      if (props.customQuery) {
        console.log('[AI Chat] Initializing RAG with custom query:', props.customQuery);
        
        // Initialize RAG system
        await invoke('initialize_rag_cmd');
        
        // Ingest data using custom query
        console.log('[AI Chat] Sending custom SQL query:', props.customQuery);
        const ingestResult = await invoke('ingest_sql_data_rag', {
          timeRange: null,
          sqlQuery: props.customQuery
        });
        
        console.log('[AI Chat] RAG ingestion result:', ingestResult);

        // Phase 1: Get initial analysis using app_usage agent
        console.log('[AI Chat] Getting initial analysis with app_usage agent...');
        const initialAnalysisResponse = await invoke('query_rag_system_cmd', {
          query: props.prompt || `Analyze my usage patterns and provide insights about my digital activity for ${props.title}`,
          topK: 10,
          similarityThreshold: 0.1,
          customQuery: null,
          timeRange: null
        });

        if (initialAnalysisResponse && (initialAnalysisResponse as any).answer) {
          const answer = (initialAnalysisResponse as any).answer;
          set({
            initialAnalysis: answer,
            isInitialAnalysisComplete: true,
            messages: [{
              role: 'ai',
              content: answer,
              timestamp: new Date()
            }]
          });
        } else {
          throw new Error('Failed to get initial analysis');
        }
      } else {
        // No custom query, just show welcome message
        set({
          messages: [{
            role: 'ai',
            content: `Hi! I'm here to help you with "${props.title}". I can analyze your data and answer questions about your digital activity. What would you like to know?`,
            timestamp: new Date()
          }]
        });
      }
    } catch (error) {
      console.error('[AI Chat] Error initializing RAG:', error);
      set({
        messages: [{
          role: 'ai',
          content: `Hi! I'm here to help you with "${props.title}". There was an issue initializing the data analysis system, but I can still help with general questions.`,
          timestamp: new Date()
        }]
      });
    } finally {
      set({ loading: false });
    }
  },

  closeDrawer: () => {
    set({
      isOpen: false,
      messages: [],
      input: '',
      loading: false,
      drawerProps: null,
      initialAnalysis: '',
      isInitialAnalysisComplete: false
    });
  },

  sendMessage: async (message: string) => {
    const { drawerProps, isInitialAnalysisComplete, initialAnalysis, messages } = get();
    
    if (!message.trim() || !drawerProps) return;

    const userMessage: AIChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    set({
      messages: [...messages, userMessage],
      input: '',
      loading: true
    });

    try {
      let aiResponse = '';

      if (isInitialAnalysisComplete && initialAnalysis) {
        // Phase 2: Conversational mode using askAIAboutData with initial analysis as context
        console.log('[AI Chat] Using conversational mode with askAIAboutData...');
        
        // Import the askAIAboutData function
        const { askAIAboutData } = await import('@/lib/services/ai-analysis');
        
        // Create context data that includes the initial analysis
        const contextData = {
          initialAnalysis: initialAnalysis,
          userQuestion: message,
          analysisTitle: drawerProps.title,
          prompt: drawerProps.prompt
        };

        aiResponse = await askAIAboutData(contextData);
      } else {
        // Fallback to RAG system if no initial analysis is available
        console.log('[AI Chat] Using RAG system as fallback...');
        
        const ragResponse = await invoke('query_rag_system_cmd', {
          query: message,
          topK: 5,
          similarityThreshold: 0.1,
          customQuery: null,
          timeRange: null
        });

        console.log('[AI Chat] RAG response:', ragResponse);

        if (ragResponse && (ragResponse as any).answer) {
          aiResponse = (ragResponse as any).answer;
          
          // Add context information if available
          if ((ragResponse as any).context_chunks && (ragResponse as any).context_chunks.length > 0) {
            aiResponse += '\n\n**Sources:**\n';
            (ragResponse as any).context_chunks.forEach((chunk: any, index: number) => {
              const sourceType = chunk.metadata?.source_type || 'Unknown';
              const appName = chunk.metadata?.app_name || 'Unknown';
              aiResponse += `- ${sourceType} from ${appName}\n`;
            });
          }
        } else {
          aiResponse = `I understand you're asking about "${message}" in the context of "${drawerProps.title}". I don't have enough specific data to answer this question accurately. Could you try rephrasing or ask about something more general?`;
        }
      }

      const aiMessage: AIChatMessage = {
        role: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };

      set(state => ({
        messages: [...state.messages, aiMessage]
      }));
    } catch (error) {
      console.error('[AI Chat] Error processing message:', error);
      
      const errorMessage: AIChatMessage = {
        role: 'ai',
        content: 'Sorry, I encountered an error while processing your request. This might be due to a connection issue or the data analysis system being unavailable. Please try again.',
        timestamp: new Date()
      };
      
      set(state => ({
        messages: [...state.messages, errorMessage]
      }));
    } finally {
      set({ loading: false });
    }
  },

  clearChat: () => {
    const { isInitialAnalysisComplete, initialAnalysis, drawerProps } = get();
    
    if (isInitialAnalysisComplete && initialAnalysis) {
      // Keep the initial analysis but clear conversation
      set({
        messages: [{
          role: 'ai',
          content: initialAnalysis,
          timestamp: new Date()
        }]
      });
    } else {
      set({
        messages: [{
          role: 'ai',
          content: `Hi! I'm here to help you with "${drawerProps?.title}". What would you like to know?`,
          timestamp: new Date()
        }]
      });
    }
  },

  getRAGStats: async () => {
    try {
      const stats = await invoke('get_rag_stats_cmd');
      console.log('[AI Chat] RAG stats:', stats);
      return stats;
    } catch (error) {
      console.error('[AI Chat] Error getting RAG stats:', error);
      return null;
    }
  },

  clearRAGData: async () => {
    try {
      await invoke('clear_rag_data');
      console.log('[AI Chat] RAG data cleared');
      
      const { drawerProps } = get();
      
      // Reset all state
      set({
        initialAnalysis: '',
        isInitialAnalysisComplete: false,
        messages: [{
          role: 'ai',
          content: `Hi! I'm here to help you with "${drawerProps?.title}". The data has been cleared and I'm ready for a fresh start. What would you like to know?`,
          timestamp: new Date()
        }]
      });
    } catch (error) {
      console.error('[AI Chat] Error clearing RAG data:', error);
    }
  }
})); 