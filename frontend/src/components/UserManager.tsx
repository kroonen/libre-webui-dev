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

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { usersApi } from '@/utils/api';
import { User, UserCreateRequest, UserUpdateRequest } from '@/types';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { Plus, Edit, Trash2, User as UserIcon, Shield } from 'lucide-react';

export const UserManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserCreateRequest>({
    username: '',
    email: '',
    password: '',
    role: 'user',
  });

  const { user: currentUser } = useAuthStore();

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersApi.getUsers();
      if (response.success && response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await usersApi.createUser(formData);
      if (response.success && response.data) {
        setUsers([...users, response.data]);
        setFormData({ username: '', email: '', password: '', role: 'user' });
        setShowCreateForm(false);
        toast.success('User created successfully');
      }
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      let errorMessage = 'Failed to create user';

      if (error instanceof Error && 'response' in error) {
        const apiError = error as Error & {
          response?: { data?: { message?: string } };
        };
        errorMessage =
          apiError.response?.data?.message || 'Failed to create user';
      }

      toast.error(errorMessage);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const updateData: UserUpdateRequest = {
        username: formData.username,
        email: formData.email,
        role: formData.role,
      };

      // Only include password if it's provided
      if (formData.password && formData.password.trim() !== '') {
        updateData.password = formData.password;
      }

      const response = await usersApi.updateUser(editingUser.id, updateData);
      if (response.success && response.data) {
        setUsers(
          users.map(u => (u.id === editingUser.id ? response.data! : u))
        );
        setEditingUser(null);
        setFormData({ username: '', email: '', password: '', role: 'user' });
        toast.success('User updated successfully');
      }
    } catch (error: unknown) {
      console.error('Error updating user:', error);
      let errorMessage = 'Failed to update user';

      if (error instanceof Error && 'response' in error) {
        const apiError = error as Error & {
          response?: { data?: { message?: string } };
        };
        errorMessage =
          apiError.response?.data?.message || 'Failed to update user';
      }

      toast.error(errorMessage);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    try {
      const response = await usersApi.deleteUser(userId);
      if (response.success) {
        setUsers(users.filter(u => u.id !== userId));
        toast.success('User deleted successfully');
      }
    } catch (error: unknown) {
      console.error('Error deleting user:', error);
      let errorMessage = 'Failed to delete user';

      if (error instanceof Error && 'response' in error) {
        const apiError = error as Error & {
          response?: { data?: { message?: string } };
        };
        errorMessage =
          apiError.response?.data?.message || 'Failed to delete user';
      }

      toast.error(errorMessage);
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email || '', // Handle null email
      password: '',
      role: user.role,
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setFormData({ username: '', email: '', password: '', role: 'user' });
  };

  const resetForm = () => {
    setFormData({ username: '', email: '', password: '', role: 'user' });
    setShowCreateForm(false);
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='w-8 h-8 border-4 border-gray-200 dark:border-gray-600 border-t-primary-500 rounded-full animate-spin'></div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header with Add User Button */}
      <div className='flex justify-between items-center'>
        <div></div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className='flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600'
        >
          <Plus size={16} />
          <span>Add User</span>
        </Button>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <Card className='bg-white dark:bg-dark-25 border border-gray-200 dark:border-dark-200 shadow-lg'>
          <CardHeader>
            <CardTitle className='text-gray-900 dark:text-gray-100'>
              Create New User
            </CardTitle>
            <CardDescription className='text-gray-600 dark:text-gray-400'>
              Add a new user to the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label
                    htmlFor='username'
                    className='text-gray-700 dark:text-gray-300'
                  >
                    Username
                  </Label>
                  <Input
                    id='username'
                    value={formData.username}
                    onChange={e =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    required
                    className='bg-white dark:bg-dark-100 border-gray-300 dark:border-dark-300 text-gray-900 dark:text-gray-100'
                  />
                </div>
                <div>
                  <Label
                    htmlFor='email'
                    className='text-gray-700 dark:text-gray-300'
                  >
                    Email
                  </Label>
                  <Input
                    id='email'
                    type='email'
                    value={formData.email}
                    onChange={e =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    className='bg-white dark:bg-dark-100 border-gray-300 dark:border-dark-300 text-gray-900 dark:text-gray-100'
                  />
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label
                    htmlFor='password'
                    className='text-gray-700 dark:text-gray-300'
                  >
                    Password
                  </Label>
                  <Input
                    id='password'
                    type='password'
                    value={formData.password}
                    onChange={e =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    className='bg-white dark:bg-dark-100 border-gray-300 dark:border-dark-300 text-gray-900 dark:text-gray-100'
                  />
                </div>
                <div>
                  <Label
                    htmlFor='role'
                    className='text-gray-700 dark:text-gray-300'
                  >
                    Role
                  </Label>
                  <select
                    id='role'
                    value={formData.role}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        role: e.target.value as 'admin' | 'user',
                      })
                    }
                    className='w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-100 text-gray-900 dark:text-gray-100 transition-colors duration-200'
                  >
                    <option value='user'>User</option>
                    <option value='admin'>Admin</option>
                  </select>
                </div>
              </div>
              <div className='flex space-x-2'>
                <Button type='submit'>Create User</Button>
                <Button type='button' variant='outline' onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Edit User Form */}
      {editingUser && (
        <Card className='bg-white dark:bg-dark-25 border border-gray-200 dark:border-dark-200 shadow-lg'>
          <CardHeader>
            <CardTitle className='text-gray-900 dark:text-gray-100'>
              Edit User: {editingUser.username}
            </CardTitle>
            <CardDescription className='text-gray-600 dark:text-gray-400'>
              Modify user information and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateUser} className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label
                    htmlFor='edit-username'
                    className='text-gray-700 dark:text-gray-300'
                  >
                    Username
                  </Label>
                  <Input
                    id='edit-username'
                    value={formData.username}
                    onChange={e =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    required
                    className='bg-white dark:bg-dark-100 border-gray-300 dark:border-dark-300 text-gray-900 dark:text-gray-100'
                  />
                </div>
                <div>
                  <Label
                    htmlFor='edit-email'
                    className='text-gray-700 dark:text-gray-300'
                  >
                    Email
                  </Label>
                  <Input
                    id='edit-email'
                    type='email'
                    value={formData.email}
                    onChange={e =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    className='bg-white dark:bg-dark-100 border-gray-300 dark:border-dark-300 text-gray-900 dark:text-gray-100'
                  />
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label
                    htmlFor='edit-password'
                    className='text-gray-700 dark:text-gray-300'
                  >
                    New Password (optional)
                  </Label>
                  <Input
                    id='edit-password'
                    type='password'
                    value={formData.password}
                    onChange={e =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder='Leave empty to keep current password'
                    className='bg-white dark:bg-dark-100 border-gray-300 dark:border-dark-300 text-gray-900 dark:text-gray-100'
                  />
                </div>
                <div>
                  <Label
                    htmlFor='edit-role'
                    className='text-gray-700 dark:text-gray-300'
                  >
                    Role
                  </Label>
                  <select
                    id='edit-role'
                    value={formData.role}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        role: e.target.value as 'admin' | 'user',
                      })
                    }
                    disabled={
                      editingUser?.id === currentUser?.id &&
                      currentUser?.role === 'admin'
                    }
                    className='w-full px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-100 text-gray-900 dark:text-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    <option value='user'>User</option>
                    <option value='admin'>Admin</option>
                  </select>
                  {editingUser?.id === currentUser?.id &&
                    currentUser?.role === 'admin' && (
                      <p className='text-xs text-amber-600 dark:text-amber-400 mt-1'>
                        Cannot change your own admin role to prevent lockout
                      </p>
                    )}
                </div>
              </div>
              <div className='flex space-x-2'>
                <Button type='submit'>Update User</Button>
                <Button type='button' variant='outline' onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <Card className='bg-white dark:bg-dark-25 border border-gray-200 dark:border-dark-200 shadow-lg'>
        <CardHeader>
          <CardTitle className='text-gray-900 dark:text-gray-100'>
            All Users ({users.length})
          </CardTitle>
          <CardDescription className='text-gray-600 dark:text-gray-400'>
            Manage existing user accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {users.map(user => (
              <div
                key={user.id}
                className='flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-100 rounded-lg border border-gray-200 dark:border-dark-300'
              >
                <div className='flex items-center space-x-3'>
                  <div className='p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg'>
                    {user.role === 'admin' ? (
                      <Shield className='h-5 w-5 text-primary-600 dark:text-primary-400' />
                    ) : (
                      <UserIcon className='h-5 w-5 text-primary-600 dark:text-primary-400' />
                    )}
                  </div>
                  <div>
                    <h3 className='font-medium text-gray-900 dark:text-gray-100'>
                      {user.username}
                      {user.id === currentUser?.id && (
                        <span className='ml-2 text-xs text-primary-600 dark:text-primary-400 font-normal'>
                          (You)
                        </span>
                      )}
                    </h3>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      {user.email || 'No email provided'} • {user.role}
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-500'>
                      Created: {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className='flex space-x-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => startEdit(user)}
                    className='text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400'
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleDeleteUser(user.id, user.username)}
                    disabled={user.id === currentUser?.id}
                    className='text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
