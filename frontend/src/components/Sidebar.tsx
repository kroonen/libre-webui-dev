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
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit3,
  Check,
  X,
  Settings,
  Database,
  User,
  LogOut,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { SettingsModal } from '@/components/SettingsModal';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';
import { ChatSession } from '@/types';
import { formatTimestamp, truncateText, cn } from '@/utils';
import { authApi } from '@/utils/api';
import { toast } from 'react-hot-toast';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose: _onClose,
  className,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    sessions,
    createSession,
    deleteSession,
    updateSessionTitle,
    selectedModel,
    models,
    currentSession,
  } = useChatStore();
  const { user, isAdmin, systemInfo } = useAuthStore();
  const { backgroundImage, sidebarCompact, toggleSidebarCompact } =
    useAppStore();

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Extract current session ID from URL using useParams
  const { sessionId } = useParams<{ sessionId: string }>();
  const currentSessionIdFromUrl = sessionId || null;

  // Get current session ID from store as fallback
  const currentSessionId = currentSession?.id || currentSessionIdFromUrl;

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);

  // Collapse sidebar on mobile when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Double-check window width at click time in case of orientation change
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        window.innerWidth < 768 && // Only on mobile
        isOpen && // Only when sidebar is open
        !sidebarCompact // Only when sidebar is expanded
      ) {
        toggleSidebarCompact();
      }
    };

    // Only add event listener on mobile when sidebar is open and expanded
    if (isOpen && !sidebarCompact && window.innerWidth < 768) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, sidebarCompact, toggleSidebarCompact]);

  const handleCreateSession = async () => {
    if (!selectedModel) return;
    const newSession = await createSession(selectedModel);
    if (newSession) {
      navigate(`/c/${newSession.id}`, { replace: true });
    }
    // On mobile, compact sidebar after creating session so user can easily access other chats
    if (window.innerWidth < 768 && !sidebarCompact) {
      toggleSidebarCompact();
    }
  };

  const handleSelectSession = (session: ChatSession) => {
    navigate(`/c/${session.id}`, { replace: true });
    // On mobile, compact sidebar after selecting session so user can easily select another
    if (window.innerWidth < 768 && !sidebarCompact) {
      toggleSidebarCompact();
    }
  };
  const handleDeleteSession = async (
    sessionId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (process.env.NODE_ENV === 'development') {
      console.log('Delete session clicked:', sessionId);
    }

    if (window.confirm('Are you sure you want to delete this chat?')) {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('Attempting to delete session:', sessionId);
        }

        // Check if we're deleting the current session
        const isCurrentSession = currentSessionId === sessionId;

        await deleteSession(sessionId);
        if (process.env.NODE_ENV === 'development') {
          console.log('Session deleted successfully');
        }

        // If we deleted the current session, navigate to another session or root
        if (isCurrentSession) {
          const remainingSessions = sessions.filter(s => s.id !== sessionId);
          if (remainingSessions.length > 0) {
            navigate(`/c/${remainingSessions[0].id}`, { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }
      } catch (_error) {
        console.error('Error deleting session:', _error);
      }
    }
  };

  const handleStartEditing = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveEdit = async (sessionId: string) => {
    if (editingTitle.trim()) {
      await updateSessionTitle(sessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditingTitle('');
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      const { logout } = useAuthStore.getState();
      logout();
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Still logout locally even if API call fails
      const { logout } = useAuthStore.getState();
      logout();
      navigate('/login');
    }
  };

  return (
    <>
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={cn(
          'fixed inset-y-0 left-0 z-50 border-r border-gray-200 dark:border-dark-200 transform transition-all duration-300 ease-in-out shadow-xl',
          // Dynamic width based on compact mode and responsive design
          sidebarCompact ? 'w-16' : 'w-80 max-sm:w-64',
          // On mobile: slide in/out from left
          // On desktop: slide in/out from left but maintain layout flow
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // Remove shadow on desktop when integrated into layout
          'lg:shadow-none',
          // Conditional background based on whether background image is set
          backgroundImage
            ? 'bg-gray-50/70 dark:bg-dark-25/70 backdrop-blur-sm'
            : 'bg-gray-50 dark:bg-dark-25',
          // Better touch scrolling on mobile
          'overscroll-behavior-contain',
          className
        )}
        style={{
          // Ensure proper touch scrolling on mobile
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className='flex flex-col h-full'>
          {/* Header */}
          <div
            className={cn(
              'border-b border-gray-200/60 dark:border-dark-200/60',
              sidebarCompact ? 'p-2' : 'p-3'
            )}
          >
            <div
              className={cn(
                'flex items-center',
                sidebarCompact ? 'justify-center mb-2' : 'justify-between mb-2'
              )}
            >
              {!sidebarCompact ? (
                <>
                  <div className='flex items-center gap-2'>
                    <Logo size='sm' />
                    <span
                      className='libre-brand text-base font-semibold text-gray-900 dark:text-dark-800'
                      style={{ lineHeight: 1 }}
                    >
                      Libre WebUI
                    </span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={toggleSidebarCompact}
                      className='h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-dark-200 active:bg-gray-200 dark:active:bg-dark-100 touch-manipulation'
                      title='Toggle sidebar size'
                    >
                      <ChevronLeft className='h-4 w-4' />
                    </Button>
                  </div>
                </>
              ) : (
                <div className='flex flex-col items-center gap-1.5'>
                  <Logo size='sm' />
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={toggleSidebarCompact}
                    className='h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-dark-200 active:bg-gray-200 dark:active:bg-dark-100 touch-manipulation'
                    title='Expand sidebar'
                  >
                    <ChevronRight className='h-4 w-4' />
                  </Button>
                </div>
              )}
            </div>

            {!sidebarCompact && (
              <Button
                onClick={handleCreateSession}
                disabled={!selectedModel || models.length === 0}
                className='w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white shadow-sm hover:shadow-md active:shadow-lg transition-all duration-200 border-0 touch-manipulation'
                size='sm'
                title={
                  !selectedModel || models.length === 0
                    ? 'No models available. Please ensure Ollama is running and models are installed.'
                    : ''
                }
              >
                <Plus className='h-4 w-4 mr-2' />
                New Chat
              </Button>
            )}

            {sidebarCompact && (
              <Button
                onClick={handleCreateSession}
                disabled={!selectedModel || models.length === 0}
                className='w-full h-9 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white shadow-sm hover:shadow-md active:shadow-lg transition-all duration-200 border-0 touch-manipulation p-0'
                title={
                  !selectedModel || models.length === 0
                    ? 'No models available. Please ensure Ollama is running and models are installed.'
                    : 'New Chat'
                }
              >
                <Plus className='h-4 w-4' />
              </Button>
            )}
          </div>

          {/* Navigation Menu */}
          <div className={cn('py-1.5', sidebarCompact ? 'px-1' : 'px-2.5')}>
            <nav
              className={cn(
                'space-y-0.5',
                sidebarCompact && 'flex flex-col items-center'
              )}
            >
              <button
                onClick={() => {
                  // Clear current session and set a flag to force welcome screen
                  const { setCurrentSession } = useChatStore.getState();
                  setCurrentSession(null);
                  // Set a flag in sessionStorage to force welcome screen
                  sessionStorage.setItem('forceWelcomeScreen', 'true');
                  navigate('/chat', { replace: true });
                  if (window.innerWidth < 768 && !sidebarCompact) {
                    toggleSidebarCompact();
                  }
                }}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left touch-manipulation',
                  sidebarCompact
                    ? 'w-11 h-11 justify-center p-0'
                    : 'w-full px-2.5 py-2',
                  location.pathname === '/chat' || location.pathname === '/'
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-200/50 hover:text-gray-900 dark:hover:text-gray-100 active:bg-gray-100 dark:active:bg-dark-200'
                )}
                title={sidebarCompact ? 'Chat' : undefined}
              >
                <MessageSquare className='h-4 w-4 shrink-0' />
                {!sidebarCompact && 'Chat'}
              </button>

              <Link
                to='/models'
                onClick={() =>
                  window.innerWidth < 768 &&
                  !sidebarCompact &&
                  toggleSidebarCompact()
                }
                className={cn(
                  'flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all duration-200 touch-manipulation',
                  sidebarCompact
                    ? 'w-11 h-11 justify-center p-0'
                    : 'w-full px-2.5 py-2',
                  location.pathname === '/models'
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-200/50 hover:text-gray-900 dark:hover:text-gray-100 active:bg-gray-100 dark:active:bg-dark-200'
                )}
                title={sidebarCompact ? 'Models' : undefined}
              >
                <Database className='h-4 w-4 shrink-0' />
                {!sidebarCompact && 'Models'}
              </Link>

              <Link
                to='/personas'
                onClick={() =>
                  window.innerWidth < 768 &&
                  !sidebarCompact &&
                  toggleSidebarCompact()
                }
                className={cn(
                  'flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all duration-200 touch-manipulation',
                  sidebarCompact
                    ? 'w-11 h-11 justify-center p-0'
                    : 'w-full px-2.5 py-2',
                  location.pathname === '/personas'
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-200/50 hover:text-gray-900 dark:hover:text-gray-100 active:bg-gray-100 dark:active:bg-dark-200'
                )}
                title={sidebarCompact ? 'Personas' : undefined}
              >
                <User className='h-4 w-4 shrink-0' />
                {!sidebarCompact && 'Personas'}
              </Link>
            </nav>
          </div>

          {/* Sessions list */}
          <div
            className='flex-1 overflow-y-auto scrollbar-thin border-t border-gray-200/60 dark:border-dark-200/60 overscroll-behavior-contain'
            style={{
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <div className={cn('p-2.5', sidebarCompact && 'px-1')}>
              {!sidebarCompact && sessions.length > 0 && (
                <div className='flex items-center justify-between mb-1.5 px-1'>
                  <h3 className='text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide'>
                    Chats
                  </h3>
                  <span className='text-xs text-gray-500 dark:text-gray-500 font-medium'>
                    {sessions.length}
                  </span>
                </div>
              )}
              {sessions.length === 0 ? (
                <div
                  className={cn(
                    'text-center py-8',
                    sidebarCompact ? 'px-1' : 'px-2'
                  )}
                >
                  <div
                    className={cn(
                      'mx-auto mb-3 bg-gray-100 dark:bg-dark-300 rounded-xl flex items-center justify-center',
                      sidebarCompact ? 'w-8 h-8' : 'w-12 h-12'
                    )}
                  >
                    <MessageSquare
                      className={cn(
                        'text-gray-400 dark:text-gray-500',
                        sidebarCompact ? 'h-4 w-4' : 'h-5 w-5'
                      )}
                    />
                  </div>
                  {!sidebarCompact && (
                    <>
                      <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                        No chats yet
                      </p>
                      <p className='text-xs mt-1 text-gray-500 dark:text-gray-500'>
                        Create your first chat above
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div
                  className={cn('space-y-0.5', sidebarCompact && 'space-y-1')}
                >
                  {sessions.map(session => {
                    const isActive = currentSessionId === session.id;

                    return (
                      <div
                        key={session.id}
                        className={cn(
                          'group relative cursor-pointer transition-all duration-200 touch-manipulation',
                          sidebarCompact
                            ? 'rounded-lg p-2 flex items-center justify-center'
                            : 'rounded-lg px-2.5 py-2',
                          isActive
                            ? 'bg-gray-100 dark:bg-dark-200'
                            : 'hover:bg-gray-50 dark:hover:bg-dark-200/50'
                        )}
                        onClick={() => handleSelectSession(session)}
                        title={
                          sidebarCompact
                            ? `${session.title} - ${session.model}`
                            : undefined
                        }
                      >
                        {sidebarCompact ? (
                          // Compact mode: Show only avatar/indicator
                          <div className='flex items-center justify-center w-full h-8'>
                            <div
                              className={cn(
                                'w-3 h-3 rounded-full',
                                isActive
                                  ? 'bg-primary-500'
                                  : 'bg-gray-300 dark:bg-gray-600'
                              )}
                            />
                          </div>
                        ) : editingSessionId === session.id ? (
                          // Editing mode (only in expanded view)
                          <div
                            className='flex items-center gap-2'
                            onClick={e => e.stopPropagation()}
                          >
                            <Input
                              value={editingTitle}
                              onChange={e => setEditingTitle(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  handleSaveEdit(session.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                              className='text-sm h-8'
                              autoFocus
                            />
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => handleSaveEdit(session.id)}
                              className='h-8 w-8 p-0 shrink-0 hover:bg-gray-100 dark:hover:bg-dark-300 active:bg-gray-200 dark:active:bg-dark-400 touch-manipulation'
                            >
                              <Check className='h-3 w-3' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={handleCancelEdit}
                              className='h-8 w-8 p-0 shrink-0 hover:bg-gray-100 dark:hover:bg-dark-300 active:bg-gray-200 dark:active:bg-dark-400 touch-manipulation'
                            >
                              <X className='h-3 w-3' />
                            </Button>
                          </div>
                        ) : (
                          // Expanded mode: Show full session details
                          <div className='flex items-center justify-between w-full'>
                            <div className='flex-1 min-w-0 mr-2'>
                              <h3
                                className={cn(
                                  'text-sm font-medium truncate leading-tight',
                                  isActive
                                    ? 'text-gray-900 dark:text-gray-100'
                                    : 'text-gray-900 dark:text-gray-100'
                                )}
                              >
                                {truncateText(session.title, 32)}
                              </h3>
                              <div className='flex items-center gap-1.5 mt-0.5'>
                                <span
                                  className={cn(
                                    'text-xs',
                                    isActive
                                      ? 'text-gray-600 dark:text-gray-400'
                                      : 'text-gray-500 dark:text-gray-500'
                                  )}
                                >
                                  {formatTimestamp(session.updatedAt)}
                                </span>
                                <span className='text-gray-400 dark:text-gray-600'>
                                  •
                                </span>
                                <span
                                  className={cn(
                                    'text-xs font-medium',
                                    isActive
                                      ? 'text-gray-700 dark:text-gray-300'
                                      : 'text-gray-600 dark:text-gray-400'
                                  )}
                                >
                                  {session.model}
                                </span>
                              </div>
                            </div>

                            <div className='flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 shrink-0'>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={e => handleStartEditing(session, e)}
                                className='h-7 w-7 sm:h-6 sm:w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 rounded-md touch-manipulation'
                                title='Rename chat'
                              >
                                <Edit3 className='h-3 w-3' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={e =>
                                  handleDeleteSession(session.id, e)
                                }
                                className='h-7 w-7 sm:h-6 sm:w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30 rounded-md touch-manipulation'
                                title='Delete chat'
                              >
                                <Trash2 className='h-3 w-3' />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* User Account Section - only show if user is authenticated */}
          {systemInfo?.requiresAuth && user && (
            <div
              className={cn(
                'border-t border-gray-200/60 dark:border-dark-200/60',
                sidebarCompact ? 'p-1.5' : 'p-2.5'
              )}
            >
              {sidebarCompact ? (
                // Compact mode: Show only user avatar and key actions
                <div className='flex flex-col items-center space-y-1.5'>
                  <div
                    className='w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center'
                    title={`${user.username} (${user.role})`}
                  >
                    <span className='text-white text-xs font-medium'>
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setSettingsOpen(true);
                      if (window.innerWidth < 768 && !sidebarCompact) {
                        toggleSidebarCompact();
                      }
                    }}
                    className='w-9 h-9 flex items-center justify-center rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-200/50 active:bg-gray-100 dark:active:bg-dark-200 touch-manipulation transition-all duration-200'
                    title='Settings'
                  >
                    <Settings className='h-4 w-4' />
                  </button>

                  {isAdmin() && (
                    <Link
                      to='/users'
                      onClick={() =>
                        window.innerWidth < 768 &&
                        !sidebarCompact &&
                        toggleSidebarCompact()
                      }
                      className='w-9 h-9 flex items-center justify-center rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-200/50 active:bg-gray-100 dark:active:bg-dark-200 touch-manipulation transition-all duration-200'
                      title='User Management'
                    >
                      <User className='h-4 w-4' />
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className='w-9 h-9 flex items-center justify-center rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30 touch-manipulation transition-all duration-200'
                    title='Sign Out'
                  >
                    <LogOut className='h-4 w-4' />
                  </button>
                </div>
              ) : (
                // Expanded mode: Show ChatGPT-style user dropdown
                <div className='relative' ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className='w-full p-2.5 rounded-xl bg-white/50 dark:bg-dark-200/50 border border-gray-200/30 dark:border-dark-300/30 hover:bg-white/70 dark:hover:bg-dark-200/70 transition-all duration-200 text-left touch-manipulation'
                  >
                    <div className='flex items-center gap-2.5'>
                      <div className='w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center'>
                        <span className='text-white text-xs font-medium'>
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
                          {user.username}
                        </p>
                        <div className='flex items-center mt-0.5'>
                          {user.role === 'admin' && (
                            <Shield
                              size={10}
                              className='text-primary-500 mr-1'
                            />
                          )}
                          <span className='text-xs text-gray-500 dark:text-gray-400 capitalize'>
                            {user.role}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200',
                          userMenuOpen && 'rotate-90'
                        )}
                      />
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {userMenuOpen && (
                    <div className='absolute bottom-full left-0 right-0 mb-2 py-2 bg-white dark:bg-dark-100 rounded-xl shadow-lg border border-gray-200/50 dark:border-dark-200/50 backdrop-blur-sm z-50'>
                      <div className='px-3 py-2 border-b border-gray-100 dark:border-dark-200/50'>
                        <div className='flex items-center gap-2.5'>
                          <div className='w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center'>
                            <span className='text-white text-sm font-medium'>
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className='flex-1 min-w-0'>
                            <p className='text-sm font-medium text-gray-900 dark:text-gray-100 truncate'>
                              {user.username}
                            </p>
                            <p className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                              {user.email || 'No email provided'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className='py-1'>
                        <button
                          onClick={() => {
                            setSettingsOpen(true);
                            setUserMenuOpen(false);
                            if (window.innerWidth < 768 && !sidebarCompact) {
                              toggleSidebarCompact();
                            }
                          }}
                          className='w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-200/50 transition-colors duration-200 text-left'
                        >
                          <Settings className='h-4 w-4 shrink-0' />
                          Settings
                        </button>

                        {isAdmin() && (
                          <Link
                            to='/users'
                            onClick={() => {
                              setUserMenuOpen(false);
                              if (window.innerWidth < 768 && !sidebarCompact) {
                                toggleSidebarCompact();
                              }
                            }}
                            className='w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-200/50 transition-colors duration-200'
                          >
                            <User className='h-4 w-4 shrink-0' />
                            User Management
                          </Link>
                        )}

                        <div className='border-t border-gray-100 dark:border-dark-200/50 my-1'></div>

                        <button
                          onClick={() => {
                            handleLogout();
                            setUserMenuOpen(false);
                          }}
                          className='w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200 text-left'
                        >
                          <LogOut className='h-4 w-4 shrink-0' />
                          Log out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
};
