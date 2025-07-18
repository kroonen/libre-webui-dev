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

import axios, { AxiosInstance } from 'axios';
import {
  OllamaModel,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaCreateRequest,
  OllamaEmbeddingsRequest,
  OllamaEmbeddingsResponse,
  OllamaChatRequest,
  OllamaChatResponse,
  getErrorMessage,
} from '../types/index.js';

class OllamaService {
  private client: AxiosInstance;
  private longOperationClient: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    // Use environment variable for timeout, default to 5 minutes for large models on multiple GPUs
    const timeout = parseInt(process.env.OLLAMA_TIMEOUT || '300000');
    // Use extended timeout for model operations (pulling, loading), default to 15 minutes
    const longOperationTimeout = parseInt(
      process.env.OLLAMA_LONG_OPERATION_TIMEOUT || '900000'
    );

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.longOperationClient = axios.create({
      baseURL: this.baseUrl,
      timeout: longOperationTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.get('/');
      return response.status === 200;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'ECONNREFUSED'
      ) {
        console.warn(
          'Ollama service is not running. Please start it with: ollama serve'
        );
      } else {
        console.error(
          'Ollama health check failed:',
          getErrorMessage(error, 'Unknown error')
        );
      }
      return false;
    }
  }

  async getModels(): Promise<OllamaModel[]> {
    try {
      console.log('Fetching models from Ollama...');
      const response = await this.client.get('/api/tags');
      console.log('Ollama response:', JSON.stringify(response.data, null, 2));
      const models = response.data.models || [];
      console.log(`Found ${models.length} models`);
      return models;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'ECONNREFUSED'
      ) {
        console.error(
          'Cannot connect to Ollama. Please ensure Ollama is running with: ollama serve'
        );
        throw new Error(
          'Ollama service is not running. Please start it with: ollama serve'
        );
      } else {
        console.error(
          'Failed to fetch models:',
          getErrorMessage(error, 'Unknown error')
        );
        throw new Error('Failed to fetch available models from Ollama');
      }
    }
  }

  async generateResponse(
    request: OllamaGenerateRequest
  ): Promise<OllamaGenerateResponse> {
    try {
      // Use long operation client for generation as it may need to load model on first use
      const response = await this.longOperationClient.post('/api/generate', {
        ...request,
        stream: false, // For non-streaming responses
      });
      return response.data;
    } catch (error: unknown) {
      console.error('Failed to generate response:', error);
      throw new Error(getErrorMessage(error, 'Failed to generate response'));
    }
  }

  async generateStreamResponse(
    request: OllamaGenerateRequest,
    onChunk: (chunk: OllamaGenerateResponse) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ): Promise<void> {
    try {
      // Use long operation client for streaming generation as it may need to load model on first use
      const response = await this.longOperationClient.post(
        '/api/generate',
        {
          ...request,
          stream: true,
        },
        {
          responseType: 'stream',
        }
      );

      let buffer = '';

      response.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              onChunk(data);
              if (data.done) {
                onComplete();
                return;
              }
            } catch (parseError) {
              console.error('Failed to parse chunk:', parseError);
            }
          }
        }
      });

      response.data.on('error', (error: Error) => {
        onError(error);
      });

      response.data.on('end', () => {
        onComplete();
      });
    } catch (error: unknown) {
      console.error('Failed to generate stream response:', error);
      onError(
        new Error(getErrorMessage(error, 'Failed to generate stream response'))
      );
    }
  }

  async pullModel(modelName: string): Promise<void> {
    try {
      console.log(`Pulling model: ${modelName}`);
      await this.longOperationClient.post('/api/pull', {
        name: modelName,
      });
      console.log(`Successfully pulled model: ${modelName}`);
    } catch (error: unknown) {
      console.error(
        'Failed to pull model:',
        String(modelName),
        getErrorMessage(error, 'Unknown error')
      );
      throw new Error(getErrorMessage(error, 'Failed to pull model'));
    }
  }

  async pullModelStream(
    modelName: string,
    onProgress: (progress: {
      status: string;
      digest?: string;
      total?: number;
      completed?: number;
      percent?: number;
    }) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ): Promise<void> {
    try {
      console.log(`Pulling model with streaming: ${modelName}`);
      const response = await this.longOperationClient.post(
        '/api/pull',
        {
          name: modelName,
          stream: true,
        },
        {
          responseType: 'stream',
        }
      );

      let buffer = '';

      response.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);

              // Calculate percentage if total and completed are available
              let percent: number | undefined;
              if (data.total && data.completed) {
                percent = Math.round((data.completed / data.total) * 100);
              }

              onProgress({
                status: data.status || 'unknown',
                digest: data.digest,
                total: data.total,
                completed: data.completed,
                percent,
              });

              // Check if pull is complete
              if (
                data.status === 'success' ||
                (!data.status && data.completed === data.total)
              ) {
                onComplete();
                return;
              }
            } catch (parseError) {
              console.error('Failed to parse pull progress chunk:', parseError);
            }
          }
        }
      });

      response.data.on('error', (error: Error) => {
        onError(error);
      });

      response.data.on('end', () => {
        onComplete();
      });
    } catch (error: unknown) {
      console.error('Failed to pull model with streaming:', error);
      onError(
        new Error(getErrorMessage(error, 'Failed to pull model with streaming'))
      );
    }
  }

  async deleteModel(modelName: string): Promise<void> {
    try {
      await this.client.delete('/api/delete', {
        data: { name: modelName },
      });
    } catch (error: unknown) {
      console.error('Failed to delete model:', error);
      throw new Error(getErrorMessage(error, 'Failed to delete model'));
    }
  }

  async showModel(
    modelName: string,
    verbose = false
  ): Promise<Record<string, unknown>> {
    try {
      const response = await this.client.post('/api/show', {
        model: modelName,
        verbose,
      });
      return response.data;
    } catch (error: unknown) {
      console.error('Failed to show model:', error);
      throw new Error(getErrorMessage(error, 'Failed to show model'));
    }
  }

  async createModel(payload: OllamaCreateRequest): Promise<void> {
    try {
      await this.client.post('/api/create', payload);
    } catch (error: unknown) {
      console.error('Failed to create model:', error);
      throw new Error(getErrorMessage(error, 'Failed to create model'));
    }
  }

  async copyModel(source: string, destination: string): Promise<void> {
    try {
      await this.client.post('/api/copy', { source, destination });
    } catch (error: unknown) {
      console.error('Failed to copy model:', error);
      throw new Error(getErrorMessage(error, 'Failed to copy model'));
    }
  }

  async pushModel(modelName: string): Promise<void> {
    try {
      await this.client.post('/api/push', { model: modelName });
    } catch (error: unknown) {
      console.error('Failed to push model:', error);
      throw new Error(getErrorMessage(error, 'Failed to push model'));
    }
  }

  async generateEmbeddings(
    payload: OllamaEmbeddingsRequest
  ): Promise<OllamaEmbeddingsResponse> {
    try {
      const response = await this.client.post('/api/embed', payload);
      return response.data;
    } catch (error: unknown) {
      console.error('Failed to generate embeddings:', error);
      throw new Error(getErrorMessage(error, 'Failed to generate embeddings'));
    }
  }

  async listRunningModels(): Promise<{ models: Record<string, unknown>[] }> {
    try {
      const response = await this.client.get('/api/ps');
      return response.data;
    } catch (error: unknown) {
      console.error('Failed to list running models:', error);
      throw new Error(getErrorMessage(error, 'Failed to list running models'));
    }
  }

  async getVersion(): Promise<{ version: string }> {
    try {
      const response = await this.client.get('/api/version');
      return response.data;
    } catch (error: unknown) {
      console.error('Failed to get version:', error);
      throw new Error(getErrorMessage(error, 'Failed to get Ollama version'));
    }
  }

  // Chat completion methods
  async generateChatResponse(
    request: OllamaChatRequest
  ): Promise<OllamaChatResponse> {
    try {
      // Use long operation client for chat generation as it may need to load model on first use
      const response = await this.longOperationClient.post('/api/chat', {
        ...request,
        stream: false,
      });
      return response.data;
    } catch (error: unknown) {
      console.error('Failed to generate chat response:', error);
      throw new Error(
        getErrorMessage(error, 'Failed to generate chat response')
      );
    }
  }

  async generateChatStreamResponse(
    request: OllamaChatRequest,
    onChunk: (chunk: OllamaChatResponse) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ): Promise<void> {
    try {
      // Use long operation client for chat streaming as it may need to load model on first use
      const response = await this.longOperationClient.post(
        '/api/chat',
        {
          ...request,
          stream: true,
        },
        {
          responseType: 'stream',
        }
      );

      let buffer = '';

      response.data.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              onChunk(data);
              if (data.done) {
                onComplete();
                return;
              }
            } catch (parseError) {
              console.error('Failed to parse chunk:', parseError);
            }
          }
        }
      });

      response.data.on('error', (error: Error) => {
        onError(error);
      });

      response.data.on('end', () => {
        onComplete();
      });
    } catch (error: unknown) {
      console.error('Failed to generate chat stream response:', error);
      onError(
        new Error(
          getErrorMessage(error, 'Failed to generate chat stream response')
        )
      );
    }
  }

  // Blob management methods
  async checkBlobExists(digest: string): Promise<boolean> {
    try {
      const response = await this.client.head(`/api/blobs/${digest}`);
      return response.status === 200;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const httpError = error as { response?: { status?: number } };
        if (httpError.response?.status === 404) {
          return false;
        }
      }
      console.error('Failed to check blob:', error);
      throw new Error(getErrorMessage(error, 'Failed to check blob existence'));
    }
  }

  async pushBlob(digest: string, data: Buffer | string): Promise<void> {
    // Only allow lowercase hex strings of length 64 (SHA256)
    if (!/^[a-f0-9]{64}$/.test(digest)) {
      throw new Error('Invalid digest format');
    }
    try {
      await this.client.post(`/api/blobs/${digest}`, data, {
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });
    } catch (error: unknown) {
      console.error('Failed to push blob:', error);
      throw new Error(getErrorMessage(error, 'Failed to push blob'));
    }
  }

  // Legacy embeddings endpoint (deprecated but still supported)
  async generateLegacyEmbeddings(
    payload: Record<string, unknown>
  ): Promise<{ embedding: number[] }> {
    try {
      const response = await this.client.post('/api/embeddings', payload);
      return response.data;
    } catch (error: unknown) {
      console.error('Failed to generate legacy embeddings:', error);
      throw new Error(
        getErrorMessage(error, 'Failed to generate legacy embeddings')
      );
    }
  }

  // Pull all models
  async pullAllModels(): Promise<{
    success: boolean;
    results: { name: string; success: boolean }[];
  }> {
    const results: { name: string; success: boolean }[] = [];
    try {
      const models = await this.getModels();
      for (const model of models) {
        try {
          await this.pullModel(model.name);
          results.push({ name: model.name, success: true });
        } catch (_err: unknown) {
          results.push({ name: model.name, success: false });
        }
      }
      return { success: true, results };
    } catch (_error: unknown) {
      return { success: false, results };
    }
  }

  // Pull all models with progress streaming
  async pullAllModelsStream(
    onProgress: (progress: {
      current: number;
      total: number;
      modelName: string;
      status: 'starting' | 'success' | 'error';
      error?: string;
    }) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const models = await this.getModels();
      const total = models.length;

      for (let i = 0; i < models.length; i++) {
        const model = models[i];
        try {
          onProgress({
            current: i + 1,
            total,
            modelName: model.name,
            status: 'starting',
          });
          await this.pullModel(model.name);
          onProgress({
            current: i + 1,
            total,
            modelName: model.name,
            status: 'success',
          });
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : 'Unknown error';
          onProgress({
            current: i + 1,
            total,
            modelName: model.name,
            status: 'error',
            error: errorMessage,
          });
        }
      }
      onComplete();
    } catch (error: unknown) {
      onError(getErrorMessage(error, 'Failed to pull all models'));
    }
  }
}

export default new OllamaService();
