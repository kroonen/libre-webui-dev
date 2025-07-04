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

import fs from 'fs';
import path from 'path';

export interface UserPreferences {
  defaultModel: string;
  theme: 'light' | 'dark';
  systemMessage: string;
  generationOptions: {
    // Core parameters
    temperature?: number; // 0.0-2.0, default 0.8
    top_p?: number; // 0.0-1.0, default 0.9
    top_k?: number; // 1-100, default 40
    min_p?: number; // 0.0-1.0, default 0.0
    typical_p?: number; // 0.0-1.0, default 0.7

    // Generation control
    num_predict?: number; // Number of tokens to predict, default 128
    seed?: number; // Random seed for reproducible outputs
    repeat_last_n?: number; // How far back to look for repetition, default 64
    repeat_penalty?: number; // Penalty for repetition, default 1.1
    presence_penalty?: number; // Penalty for token presence, default 0.0
    frequency_penalty?: number; // Penalty for token frequency, default 0.0
    penalize_newline?: boolean; // Penalize newlines, default true

    // Context and processing
    num_ctx?: number; // Context window size, default 2048
    num_batch?: number; // Batch size for processing, default 512
    num_keep?: number; // Number of tokens to keep from prompt

    // Advanced options
    stop?: string[]; // Stop sequences
    numa?: boolean; // Enable NUMA support
    num_thread?: number; // Number of threads to use
    num_gpu?: number; // Number of GPU layers
    main_gpu?: number; // Main GPU to use
    use_mmap?: boolean; // Use memory mapping

    // Model behavior
    format?: string | Record<string, unknown>; // Response format (json, etc.)
    raw?: boolean; // Skip prompt templating
    keep_alive?: string; // Keep model in memory duration
  };
  // Embedding settings for semantic search
  embeddingSettings: {
    enabled: boolean;
    model: string;
    chunkSize: number;
    chunkOverlap: number;
    similarityThreshold: number;
  };
}

class PreferencesService {
  private preferencesFile = path.join(process.cwd(), 'preferences.json');
  private defaultPreferences: UserPreferences = {
    defaultModel: '',
    theme: 'light',
    systemMessage: 'You are a helpful assistant.',
    generationOptions: {
      // Core parameters
      temperature: 0.8,
      top_p: 0.9,
      top_k: 40,
      min_p: 0.0,
      typical_p: 0.7,

      // Generation control
      num_predict: 128,
      seed: undefined,
      repeat_last_n: 64,
      repeat_penalty: 1.1,
      presence_penalty: 0.0,
      frequency_penalty: 0.0,
      penalize_newline: true,

      // Context and processing
      num_ctx: 2048,
      num_batch: 512,
      num_keep: undefined,

      // Advanced options
      stop: undefined,
      numa: undefined,
      num_thread: undefined,
      num_gpu: undefined,
      main_gpu: undefined,
      use_mmap: true,

      // Model behavior
      format: undefined,
      raw: undefined,
      keep_alive: undefined,
    },
    // Embedding settings for semantic search
    embeddingSettings: {
      enabled: false, // Start with embeddings disabled
      model: 'nomic-embed-text', // Default embedding model
      chunkSize: 1000,
      chunkOverlap: 200,
      similarityThreshold: 0.3,
    },
  };

  constructor() {
    this.ensurePreferencesFile();
  }

  private ensurePreferencesFile() {
    try {
      if (!fs.existsSync(this.preferencesFile)) {
        // Ensure the directory exists
        const dir = path.dirname(this.preferencesFile);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(
          this.preferencesFile,
          JSON.stringify(this.defaultPreferences, null, 2)
        );
        console.log('Created preferences.json with default settings');
      }
    } catch (_error) {
      console.error('Failed to create preferences file:', _error);
    }
  }

  getPreferences(): UserPreferences {
    try {
      if (fs.existsSync(this.preferencesFile)) {
        const data = fs.readFileSync(this.preferencesFile, 'utf8');
        const preferences = JSON.parse(data);
        // Merge with defaults to ensure all fields exist
        return { ...this.defaultPreferences, ...preferences };
      }
    } catch (_error) {
      console.error('Failed to load preferences:', _error);
    }
    return this.defaultPreferences;
  }

  updatePreferences(updates: Partial<UserPreferences>): UserPreferences {
    try {
      const currentPreferences = this.getPreferences();
      const updatedPreferences = { ...currentPreferences, ...updates };

      fs.writeFileSync(
        this.preferencesFile,
        JSON.stringify(updatedPreferences, null, 2)
      );
      console.log('Preferences updated:', updates);

      return updatedPreferences;
    } catch (_error) {
      console.error('Failed to save preferences:', _error);
      throw _error;
    }
  }

  setDefaultModel(model: string): UserPreferences {
    return this.updatePreferences({ defaultModel: model });
  }

  setSystemMessage(message: string): UserPreferences {
    return this.updatePreferences({ systemMessage: message });
  }

  setGenerationOptions(
    options: Partial<UserPreferences['generationOptions']>
  ): UserPreferences {
    const currentPreferences = this.getPreferences();
    const updatedGenerationOptions = {
      ...currentPreferences.generationOptions,
      ...options,
    };
    return this.updatePreferences({
      generationOptions: updatedGenerationOptions,
    });
  }

  resetGenerationOptions(): UserPreferences {
    return this.updatePreferences({
      generationOptions: this.defaultPreferences.generationOptions,
    });
  }

  setEmbeddingSettings(
    settings: Partial<UserPreferences['embeddingSettings']>
  ): UserPreferences {
    const currentPreferences = this.getPreferences();
    const updatedEmbeddingSettings = {
      ...currentPreferences.embeddingSettings,
      ...settings,
    };
    return this.updatePreferences({
      embeddingSettings: updatedEmbeddingSettings,
    });
  }

  getDefaultModel(): string {
    return this.getPreferences().defaultModel;
  }

  getSystemMessage(): string {
    return this.getPreferences().systemMessage;
  }

  getGenerationOptions(): UserPreferences['generationOptions'] {
    return this.getPreferences().generationOptions;
  }

  getEmbeddingSettings(): UserPreferences['embeddingSettings'] {
    return this.getPreferences().embeddingSettings;
  }

  resetEmbeddingSettings(): UserPreferences {
    return this.updatePreferences({
      embeddingSettings: this.defaultPreferences.embeddingSettings,
    });
  }
}

export default new PreferencesService();
