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
import { ollamaApi } from '@/utils/api';
import { Button } from '@/components/ui/Button';
import { RunningModel } from '@/types';
import toast from 'react-hot-toast';

interface ModelInfo {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    format?: string;
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

export const ModelManager: React.FC = () => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [runningModels, setRunningModels] = useState<RunningModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [pullModelName, setPullModelName] = useState('');
  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState<{
    status: string;
    percent?: number;
    total?: number;
    completed?: number;
  } | null>(null);
  const [cancelPull, setCancelPull] = useState<(() => void) | null>(null);

  // Load models and running models
  const loadData = async () => {
    setLoading(true);
    try {
      const [modelsResponse, runningResponse] = await Promise.all([
        ollamaApi.getModels(),
        ollamaApi.listRunningModels(),
      ]);

      if (modelsResponse.success) {
        setModels(modelsResponse.data || []);
      }

      if (runningResponse.success) {
        setRunningModels(
          Array.isArray(runningResponse.data) ? runningResponse.data : []
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error('Failed to load models: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePullModel = async () => {
    if (!pullModelName.trim()) {
      toast.error('Please enter a model name');
      return;
    }

    setPulling(true);
    setPullProgress({ status: 'starting' });

    try {
      const cancelFn = ollamaApi.pullModelStream(
        pullModelName.trim(),
        progress => {
          setPullProgress(progress);
        },
        () => {
          setPullProgress(null);
          setPulling(false);
          setCancelPull(null);
          toast.success(`Model ${pullModelName} pulled successfully`);
          setPullModelName('');
          loadData(); // Reload the models list
        },
        error => {
          setPullProgress(null);
          setPulling(false);
          setCancelPull(null);
          toast.error('Failed to pull model: ' + error);
        }
      );
      setCancelPull(() => cancelFn);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error('Failed to pull model: ' + errorMessage);
      setPullProgress(null);
      setPulling(false);
      setCancelPull(null);
    }
  };

  const handleCancelPull = () => {
    if (cancelPull) {
      cancelPull();
      setCancelPull(null);
      setPulling(false);
      setPullProgress(null);
      toast.success('Model pull cancelled');
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete model "${modelName}"?`)) {
      return;
    }

    try {
      await ollamaApi.deleteModel(modelName);
      toast.success(`Model ${modelName} deleted successfully`);
      await loadData(); // Reload the models list
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error('Failed to delete model: ' + errorMessage);
    }
  };

  const handleShowModel = async (modelName: string) => {
    try {
      const response = await ollamaApi.showModel(modelName, true);
      if (response.success) {
        // Display model information in a modal or expanded view
        console.log('Model info:', response.data);
        toast.success('Model information loaded (check console)');
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error('Failed to get model info: ' + errorMessage);
    }
  };

  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const isModelRunning = (modelName: string) => {
    return (
      Array.isArray(runningModels) &&
      runningModels.some((m: RunningModel) => m.name === modelName)
    );
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-gray-600 dark:text-dark-600'>
          Loading models...
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Pull Model Section */}
      <div className='bg-white dark:bg-dark-100 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-dark-300'>
        <h3 className='text-lg font-semibold mb-4 text-gray-900 dark:text-dark-800'>
          Pull New Model
        </h3>
        <div className='flex gap-2'>
          <input
            type='text'
            value={pullModelName}
            onChange={e => setPullModelName(e.target.value)}
            placeholder='Enter model name (e.g., llama3.2, codellama)'
            className='flex-1 px-3 py-2 border border-gray-300 dark:border-dark-300 rounded-md bg-white dark:bg-dark-50 text-gray-900 dark:text-dark-700'
            disabled={pulling}
          />
          {pulling ? (
            <Button
              onClick={handleCancelPull}
              variant='outline'
              className='px-4 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
            >
              Cancel
            </Button>
          ) : (
            <Button
              onClick={handlePullModel}
              disabled={!pullModelName.trim()}
              className='px-4 py-2'
            >
              Pull Model
            </Button>
          )}
        </div>

        {/* Progress Bar */}
        {pulling && pullProgress && (
          <div className='mt-4 p-3 bg-gray-50 dark:bg-dark-200 rounded-md border border-gray-200 dark:border-dark-300'>
            <div className='flex items-center justify-between mb-2'>
              <span className='text-sm font-medium text-gray-800 dark:text-dark-700'>
                {pullProgress.status === 'starting'
                  ? 'Initializing...'
                  : pullProgress.status === 'pulling'
                    ? 'Pulling model...'
                    : pullProgress.status === 'verifying sha256'
                      ? 'Verifying...'
                      : pullProgress.status === 'writing manifest'
                        ? 'Writing manifest...'
                        : pullProgress.status === 'removing any unused layers'
                          ? 'Cleaning up...'
                          : pullProgress.status}
              </span>
              {pullProgress.percent !== undefined && (
                <span className='text-sm text-gray-600 dark:text-dark-600'>
                  {pullProgress.percent}%
                </span>
              )}
            </div>

            {pullProgress.percent !== undefined && (
              <div className='w-full bg-gray-200 dark:bg-dark-400 rounded-full h-2'>
                <div
                  className='bg-gray-600 dark:bg-dark-600 h-2 rounded-full transition-all duration-300'
                  style={{ width: `${pullProgress.percent}%` }}
                />
              </div>
            )}

            {pullProgress.total && pullProgress.completed && (
              <div className='mt-2 text-xs text-gray-600 dark:text-dark-600'>
                {(pullProgress.completed / (1024 * 1024 * 1024)).toFixed(2)} GB
                / {(pullProgress.total / (1024 * 1024 * 1024)).toFixed(2)} GB
              </div>
            )}
          </div>
        )}

        <p className='text-sm text-gray-600 dark:text-dark-600 mt-2'>
          Popular models: deepseek-r1, gemma3n, gemma3, qwen3, qwen2.5vl,
          llama3.1, nomic-embed-text, llama3.2, mistral, qwen2.5, llama3
        </p>
      </div>

      {/* Running Models Section */}
      {Array.isArray(runningModels) && runningModels.length > 0 && (
        <div className='bg-white dark:bg-dark-100 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-dark-300'>
          <h3 className='text-lg font-semibold mb-4 text-gray-900 dark:text-dark-800'>
            Running Models
          </h3>
          <div className='space-y-2'>
            {runningModels.map((model: RunningModel) => (
              <div
                key={model.name}
                className='flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800'
              >
                <div>
                  <div className='font-medium text-green-800 dark:text-green-400'>
                    {model.name}
                  </div>
                  <div className='text-sm text-green-600 dark:text-green-500'>
                    VRAM: {formatSize(model.size_vram || 0)}
                  </div>
                </div>
                <div className='text-xs text-green-600 dark:text-green-500'>
                  ● Running
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Local Models Section */}
      <div className='bg-white dark:bg-dark-100 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-dark-300'>
        <h3 className='text-lg font-semibold mb-4 text-gray-900 dark:text-dark-800'>
          Local Models ({models.length})
        </h3>

        {models.length === 0 ? (
          <div className='text-center py-8 text-gray-600 dark:text-dark-600'>
            No models found. Pull a model to get started.
          </div>
        ) : (
          <div className='space-y-3'>
            {models.map(model => (
              <div
                key={model.name}
                className='flex items-center justify-between p-4 border border-gray-200 dark:border-dark-300 rounded-md hover:bg-gray-50 dark:hover:bg-dark-200 transition-colors'
              >
                <div className='flex-1'>
                  <div className='flex items-center gap-2'>
                    <h4 className='font-medium text-gray-900 dark:text-dark-800'>
                      {model.name}
                    </h4>
                    {isModelRunning(model.name) && (
                      <span className='inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'>
                        ● Running
                      </span>
                    )}
                  </div>

                  <div className='flex gap-4 text-sm text-gray-600 dark:text-dark-600 mt-1'>
                    <span>Size: {formatSize(model.size)}</span>
                    {model.details?.parameter_size && (
                      <span>Parameters: {model.details.parameter_size}</span>
                    )}
                    {model.details?.quantization_level && (
                      <span>
                        Quantization: {model.details.quantization_level}
                      </span>
                    )}
                    {model.details?.family && (
                      <span>Family: {model.details.family}</span>
                    )}
                  </div>

                  <div className='text-xs text-gray-500 dark:text-dark-500 mt-1'>
                    Modified: {new Date(model.modified_at).toLocaleString()}
                  </div>
                </div>

                <div className='flex gap-2'>
                  <Button
                    onClick={() => handleShowModel(model.name)}
                    variant='outline'
                    size='sm'
                  >
                    Info
                  </Button>
                  <Button
                    onClick={() => handleDeleteModel(model.name)}
                    variant='outline'
                    size='sm'
                    className='text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions Section */}
      <div className='bg-white dark:bg-dark-100 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-dark-300'>
        <h3 className='text-lg font-semibold mb-4 text-gray-900 dark:text-dark-800'>
          Quick Actions
        </h3>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <Button
            onClick={async () => {
              try {
                const response = await ollamaApi.getVersion();
                if (response.success && response.data) {
                  toast.success(`Ollama version: ${response.data.version}`);
                }
              } catch (error: unknown) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                toast.error('Failed to get version: ' + errorMessage);
              }
            }}
            variant='outline'
            className='w-full'
          >
            Check Ollama Version
          </Button>

          <Button
            onClick={async () => {
              try {
                const response = await ollamaApi.checkHealth();
                if (response.success) {
                  toast.success('Ollama is healthy!');
                }
              } catch (error: unknown) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                toast.error('Ollama health check failed: ' + errorMessage);
              }
            }}
            variant='outline'
            className='w-full'
          >
            Health Check
          </Button>

          <Button onClick={loadData} variant='outline' className='w-full'>
            Refresh Models
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModelManager;
