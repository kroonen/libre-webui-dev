/*
 * Libre WebUI
 * Copyright (C) 2025 Kroonen AI, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip, Plus, Minus } from 'lucide-react';
import { Button, Textarea } from '@/components/ui';
import { ImageUpload } from './ImageUpload';
import { DocumentUpload } from './DocumentUpload';
import { DocumentIndicator } from './DocumentIndicator';
import { StructuredOutput } from './StructuredOutput';
import { ModelSelector } from './ModelSelector';
import { useAppStore } from '@/store/appStore';
import { useChatStore } from '@/store/chatStore';
import { personaApi, chatApi } from '@/utils/api';
import { toast } from 'react-hot-toast';
import { cn } from '@/utils';
import { Persona } from '@/types';

interface ChatInputProps {
  onSendMessage: (
    message: string,
    images?: string[],
    format?: string | Record<string, unknown>
  ) => void;
  onStopGeneration: () => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStopGeneration,
  disabled = false,
}) => {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [format, setFormat] = useState<string | Record<string, unknown> | null>(
    null
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const { isGenerating, setBackgroundImage } = useAppStore();
  const { currentSession, models } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() || isGenerating) return;

    onSendMessage(
      message.trim(),
      images.length > 0 ? images : undefined,
      format || undefined
    );
    setMessage('');
    setImages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleStopGeneration = () => {
    onStopGeneration();
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [message]);

  // Load current persona when session changes
  useEffect(() => {
    const loadCurrentPersona = async () => {
      if (currentSession?.personaId) {
        try {
          const response = await personaApi.getPersona(
            currentSession.personaId
          );
          if (response.success && response.data) {
            setCurrentPersona(response.data);
          } else {
            console.warn(
              `Persona ${currentSession.personaId} not found, clearing reference`
            );
            setCurrentPersona(null);
            // Clear the personaId from the session to prevent repeated requests
            const { setCurrentSession } = useChatStore.getState();
            setCurrentSession({
              ...currentSession,
              personaId: undefined,
            });
          }
        } catch (error) {
          console.error('Failed to load current persona:', error);
          setCurrentPersona(null);
          // Clear the personaId from the session to prevent repeated requests
          if (currentSession) {
            const { setCurrentSession } = useChatStore.getState();
            setCurrentSession({
              ...currentSession,
              personaId: undefined,
            });
          }
        }
      } else {
        setCurrentPersona(null);
      }
    };

    loadCurrentPersona();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.personaId]);

  const handleModelOrPersonaChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = event.target.value;
    if (!currentSession) return;

    try {
      // Check if the selected value is a persona
      if (value.startsWith('persona:')) {
        const personaId = value.replace('persona:', '');

        // Get persona details to use its model
        const personaResponse = await personaApi.getPersona(personaId);
        if (!personaResponse.success || !personaResponse.data) {
          toast.error('Failed to load persona details');
          return;
        }

        const persona = personaResponse.data;

        // Update session with persona and its model
        const response = await chatApi.updateSession(currentSession.id, {
          personaId: personaId,
          model: value, // Keep the persona model string (persona:xxx)
        });

        if (response.success && response.data) {
          // Update both currentSession and the sessions array
          const { sessions } = useChatStore.getState();
          const updatedSessions = sessions.map(s =>
            s.id === currentSession.id ? response.data! : s
          );
          useChatStore.setState({
            sessions: updatedSessions,
            currentSession: response.data,
          });

          // Apply persona background if it has one
          if (persona.background) {
            setBackgroundImage(persona.background);
          }

          toast.success('Persona applied');
        }
      } else {
        // It's a regular model - update the model and clear persona
        const response = await chatApi.updateSession(currentSession.id, {
          model: value,
          personaId: undefined,
        });

        if (response.success && response.data) {
          // Update both currentSession and the sessions array
          const { sessions } = useChatStore.getState();
          const updatedSessions = sessions.map(s =>
            s.id === currentSession.id ? response.data! : s
          );
          useChatStore.setState({
            sessions: updatedSessions,
            currentSession: response.data,
          });

          setBackgroundImage(null);
          toast.success('Model updated');
        }
      }
    } catch (error) {
      console.error('Failed to update session:', error);
      toast.error('Failed to update session');
    }
  };

  const hasAdvancedFeatures = images.length > 0 || format !== null;
  return (
    <div className='border-t border-gray-100 dark:border-dark-200 bg-white dark:bg-dark-100'>
      {/* Advanced Features Panel */}
      {showAdvanced && (
        <div className='border-b border-gray-100 dark:border-dark-200 p-4 space-y-4'>
          <ImageUpload
            images={images}
            onImagesChange={setImages}
            maxImages={5}
          />
          <DocumentUpload sessionId={currentSession?.id} disabled={disabled} />
          <StructuredOutput format={format} onFormatChange={setFormat} />
        </div>
      )}

      {/* Main Input Area - Unified Input Bar */}
      <div className='p-3 sm:p-4'>
        <form onSubmit={handleSubmit}>
          {/* Unified Input Container */}
          <div
            className={cn(
              'flex items-center gap-2 p-2 sm:p-3 rounded-2xl sm:rounded-3xl border transition-all duration-200',
              'bg-gray-50 dark:bg-dark-50 border-gray-200 dark:border-dark-300',
              'hover:border-gray-300 dark:hover:border-dark-400',
              'focus-within:border-primary-400 dark:focus-within:border-primary-500 focus-within:bg-white dark:focus-within:bg-dark-50',
              'shadow-sm hover:shadow-md focus-within:shadow-lg'
            )}
          >
            {/* Advanced Features Toggle - Integrated Left */}
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={cn(
                'h-8 w-8 sm:h-9 sm:w-9 !p-0 rounded-full flex-shrink-0',
                'hover:bg-gray-200 dark:hover:bg-dark-200 transition-colors touch-manipulation',
                hasAdvancedFeatures && 'text-primary-600 dark:text-primary-400',
                showAdvanced && 'bg-gray-200 dark:bg-dark-200'
              )}
              title='Attachments and advanced features'
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0',
              }}
            >
              {hasAdvancedFeatures ? (
                <div className='relative flex items-center justify-center'>
                  <Paperclip className='h-4 w-4' />
                  <div className='absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-primary-500 rounded-full' />
                </div>
              ) : showAdvanced ? (
                <Minus className='h-4 w-4' />
              ) : (
                <Plus className='h-4 w-4' />
              )}
            </Button>

            {/* Text Input Area */}
            <div className='flex-1 min-w-0'>
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Send a message'
                disabled={disabled}
                className='!border-0 !bg-transparent !shadow-none !p-0 !m-0 !rounded-none !focus:ring-0 !focus:border-0 !focus:shadow-none !focus:bg-transparent min-h-[32px] sm:min-h-[36px] max-h-[120px] resize-none scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-dark-400 focus:outline-none placeholder:text-gray-500 dark:placeholder:text-dark-500 text-base sm:text-sm leading-none touch-manipulation'
                rows={1}
                style={{
                  boxShadow: 'none !important',
                  border: 'none !important',
                  outline: 'none !important',
                  background: 'transparent !important',
                  padding: '0 !important',
                  margin: '0 !important',
                  lineHeight: '1.2 !important',
                  verticalAlign: 'middle',
                }}
              />
            </div>

            {/* Integrated Controls Row */}
            <div className='flex items-center gap-1 sm:gap-2 flex-shrink-0'>
              {/* Model Selector - Integrated */}
              {currentSession && models.length > 0 && (
                <div className='hidden sm:block'>
                  <ModelSelector
                    models={models}
                    selectedModel={
                      currentSession.personaId
                        ? `persona:${currentSession.personaId}`
                        : currentSession.model
                    }
                    onModelChange={handleModelOrPersonaChange}
                    currentPersona={currentPersona}
                    className='min-w-[160px] max-w-[240px] border-0 bg-gray-100 dark:bg-dark-100 rounded-xl text-sm'
                    compact
                  />
                </div>
              )}

              {/* Send/Stop Button - Integrated Right */}
              {isGenerating ? (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={handleStopGeneration}
                  className={cn(
                    'h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-full flex-shrink-0 flex items-center justify-center',
                    'hover:bg-gray-200 dark:hover:bg-dark-200 transition-colors touch-manipulation'
                  )}
                  title='Stop generation'
                >
                  <Square className='h-4 w-4' />
                </Button>
              ) : (
                <Button
                  type='submit'
                  variant='ghost'
                  size='sm'
                  disabled={!message.trim() || disabled}
                  className={cn(
                    'h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-full flex-shrink-0 flex items-center justify-center',
                    'hover:bg-primary-100 dark:hover:bg-primary-900/30 text-primary-600 dark:text-primary-400',
                    'disabled:text-gray-400 dark:disabled:text-dark-500 disabled:hover:bg-transparent',
                    'transition-all duration-150 touch-manipulation',
                    message.trim() &&
                      !disabled &&
                      'hover:scale-105 active:scale-95'
                  )}
                  title='Send message'
                >
                  <Send className='h-4 w-4' />
                </Button>
              )}
            </div>
          </div>
        </form>

        {/* Mobile-only Model Selector */}
        {currentSession && models.length > 0 && (
          <div className='sm:hidden mt-3'>
            <ModelSelector
              models={models}
              selectedModel={
                currentSession.personaId
                  ? `persona:${currentSession.personaId}`
                  : currentSession.model
              }
              onModelChange={handleModelOrPersonaChange}
              currentPersona={currentPersona}
              className='w-full rounded-xl bg-gray-100 dark:bg-dark-100 border-0'
              compact
            />
          </div>
        )}

        <div className='mt-2 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-dark-600'>
          <DocumentIndicator sessionId={currentSession?.id} />
          <div className='text-center'>
            <a
              href='https://librewebui.org'
              target='_blank'
              rel='noopener noreferrer'
              className='libre-brand underline hover:text-primary-600 dark:hover:text-primary-400 transition-colors'
              style={{ fontSize: '1.1em', lineHeight: 1 }}
            >
              Libre WebUI
            </a>{' '}
            <span
              className='text-xs text-gray-400 dark:text-gray-500'
              style={{ fontSize: '0.55rem' }}
            >
              v{import.meta.env.VITE_APP_VERSION || '0.1.3'}
            </span>{' '}
            <span className='text-gray-300 dark:text-gray-600 opacity-50'>
              •
            </span>{' '}
            <span
              className='text-gray-400 dark:text-gray-500'
              style={{ fontSize: '0.55rem' }}
            >
              LLM can make mistakes - verify important information
            </span>
            {hasAdvancedFeatures && (
              <span className='ml-2 text-primary-600 dark:text-primary-400'>
                •{' '}
                {images.length > 0 &&
                  `${images.length} image${images.length > 1 ? 's' : ''}`}
                {images.length > 0 && format && ' • '}
                {format && 'Structured output'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
