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

import React, { useState, useRef } from 'react';
import {
  Code,
  FileText,
  Globe,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  AlertTriangle,
  Download,
  ExternalLink,
  Eye,
  Code2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { OptimizedSyntaxHighlighter } from '@/components/OptimizedSyntaxHighlighter';
import { useAppStore } from '@/store/appStore';
import { Artifact } from '@/types';
import { cn } from '@/utils';

interface ArtifactRendererProps {
  artifact: Artifact;
  className?: string;
  isFullscreen?: boolean;
  onFullscreenToggle?: () => void;
}

export const ArtifactRenderer: React.FC<ArtifactRendererProps> = ({
  artifact,
  className,
  isFullscreen = false,
  onFullscreenToggle,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { theme } = useAppStore();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_err) {
      console.error('Failed to copy:', _err);
    }
  };

  const downloadArtifact = () => {
    const blob = new Blob([artifact.content], {
      type: getContentType(artifact.type),
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.title}.${getFileExtension(artifact.type)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getContentType = (type: string) => {
    switch (type) {
      case 'html':
        return 'text/html';
      case 'react':
        return 'text/javascript';
      case 'svg':
        return 'image/svg+xml';
      case 'css':
        return 'text/css';
      case 'json':
        return 'application/json';
      default:
        return 'text/plain';
    }
  };

  const getFileExtension = (type: string) => {
    switch (type) {
      case 'html':
        return 'html';
      case 'react':
        return 'jsx';
      case 'svg':
        return 'svg';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      default:
        return 'txt';
    }
  };

  const getIcon = () => {
    switch (artifact.type) {
      case 'html':
        return <Globe className='h-4 w-4' />;
      case 'react':
        return <Code className='h-4 w-4' />;
      case 'svg':
        return <FileText className='h-4 w-4' />;
      case 'code':
        return <Code className='h-4 w-4' />;
      default:
        return <FileText className='h-4 w-4' />;
    }
  };

  const renderHtml = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${artifact.title}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0; 
              padding: 16px;
              background: white;
              color: #333;
            }
            * { box-sizing: border-box; }
          </style>
        </head>
        <body>
          ${artifact.content}
        </body>
      </html>
    `;

    return (
      <iframe
        ref={iframeRef}
        srcDoc={htmlContent}
        className='w-full h-96 border-0 rounded-lg'
        sandbox='allow-scripts allow-same-origin'
        title={artifact.title}
      />
    );
  };

  const renderSvg = () => {
    try {
      return (
        <div
          className='w-full h-96 flex items-center justify-center bg-gray-50 dark:bg-dark-100 rounded-lg overflow-hidden border border-gray-200 dark:border-dark-200'
          dangerouslySetInnerHTML={{ __html: artifact.content }}
        />
      );
    } catch (_err) {
      return (
        <div className='w-full h-96 flex items-center justify-center bg-gray-50 dark:bg-dark-100 rounded-lg border border-gray-200 dark:border-dark-200'>
          <div className='text-center'>
            <AlertTriangle className='h-8 w-8 text-red-500 mx-auto mb-2' />
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Invalid SVG content
            </p>
          </div>
        </div>
      );
    }
  };

  const renderCode = () => {
    // Auto-detect language based on artifact type if not specified
    const getLanguage = () => {
      if (artifact.language) {
        return artifact.language;
      }

      switch (artifact.type) {
        case 'html':
          return 'html';
        case 'react':
          return 'jsx';
        case 'svg':
          return 'xml';
        case 'json':
          return 'json';
        default:
          return 'text';
      }
    };

    return (
      <div className='relative max-h-96 overflow-auto'>
        <OptimizedSyntaxHighlighter
          language={getLanguage()}
          isDark={theme.mode === 'dark'}
          className='!m-0 !rounded-lg'
        >
          {artifact.content}
        </OptimizedSyntaxHighlighter>
      </div>
    );
  };

  const renderJson = () => {
    try {
      const parsedJson = JSON.parse(artifact.content);
      const formattedJson = JSON.stringify(parsedJson, null, 2);

      return (
        <div className='relative max-h-96 overflow-auto'>
          <OptimizedSyntaxHighlighter
            language='json'
            isDark={theme.mode === 'dark'}
            className='!m-0 !rounded-lg'
          >
            {formattedJson}
          </OptimizedSyntaxHighlighter>
        </div>
      );
    } catch (_err) {
      return (
        <div className='w-full h-32 flex items-center justify-center bg-gray-50 dark:bg-dark-100 rounded-lg border border-gray-200 dark:border-dark-200'>
          <div className='text-center'>
            <AlertTriangle className='h-8 w-8 text-red-500 mx-auto mb-2' />
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Invalid JSON content
            </p>
          </div>
        </div>
      );
    }
  };

  const renderContent = () => {
    // Show raw code if in code view mode
    if (viewMode === 'code') {
      return renderCode();
    }

    // Otherwise show the rendered preview
    switch (artifact.type) {
      case 'html':
        return renderHtml();
      case 'svg':
        return renderSvg();
      case 'json':
        return renderJson();
      case 'code':
      case 'text':
      default:
        return renderCode();
    }
  };

  // Determine if we should show the view mode toggle
  const shouldShowViewToggle = () => {
    return (
      artifact.type === 'html' ||
      artifact.type === 'svg' ||
      artifact.type === 'react'
    );
  };

  return (
    <div
      className={cn(
        'border border-gray-200 dark:border-dark-200 rounded-xl bg-white dark:bg-dark-25 shadow-lg transition-all duration-300 hover:shadow-xl',
        isFullscreen && 'fixed inset-4 z-50 shadow-2xl animate-scale-in',
        !isFullscreen && 'animate-fade-in',
        className
      )}
    >
      {/* Header */}
      <div className='flex items-center justify-between p-4 border-b border-gray-100 dark:border-dark-200'>
        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-2'>
            {getIcon()}
            <h3 className='font-semibold text-gray-900 dark:text-gray-100 truncate'>
              {artifact.title}
            </h3>
          </div>
          <span className='text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full font-medium'>
            {artifact.type.toUpperCase()}
          </span>
        </div>

        <div className='flex items-center gap-1'>
          {/* View mode toggle for previewable artifacts */}
          {shouldShowViewToggle() && (
            <>
              <Button
                variant={viewMode === 'preview' ? 'primary' : 'ghost'}
                size='sm'
                onClick={() => setViewMode('preview')}
                className='h-8 px-3 text-xs'
                title='Preview mode'
              >
                <Eye className='h-3 w-3 mr-1' />
                Preview
              </Button>
              <Button
                variant={viewMode === 'code' ? 'primary' : 'ghost'}
                size='sm'
                onClick={() => setViewMode('code')}
                className='h-8 px-3 text-xs'
                title='Code mode'
              >
                <Code2 className='h-3 w-3 mr-1' />
                Code
              </Button>
              <div className='w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1' />
            </>
          )}

          <Button
            variant='ghost'
            size='sm'
            onClick={() => copyToClipboard(artifact.content)}
            className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-dark-200'
            title='Copy content'
          >
            {copied ? (
              <Check className='h-4 w-4 text-green-500' />
            ) : (
              <Copy className='h-4 w-4' />
            )}
          </Button>

          <Button
            variant='ghost'
            size='sm'
            onClick={downloadArtifact}
            className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-dark-200'
            title='Download'
          >
            <Download className='h-4 w-4' />
          </Button>

          {onFullscreenToggle && (
            <Button
              variant='ghost'
              size='sm'
              onClick={onFullscreenToggle}
              className='h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-dark-200'
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className='h-4 w-4' />
              ) : (
                <Maximize2 className='h-4 w-4' />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className='p-4'>
        {artifact.description && (
          <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
            {artifact.description}
          </p>
        )}

        {renderContent()}
      </div>

      {/* Footer */}
      <div className='flex items-center justify-between p-3 border-t border-gray-100 dark:border-dark-200 bg-gray-50 dark:bg-dark-100/50'>
        <div className='text-xs text-gray-500 dark:text-gray-400'>
          Created: {new Date(artifact.createdAt).toLocaleString()}
        </div>

        {(artifact.type === 'html' || artifact.type === 'react') && (
          <Button
            variant='ghost'
            size='sm'
            onClick={() => {
              const newWindow = window.open('', '_blank');
              if (newWindow) {
                newWindow.document.write(artifact.content);
                newWindow.document.close();
              }
            }}
            className='text-xs hover:bg-gray-100 dark:hover:bg-dark-200'
          >
            <ExternalLink className='h-3 w-3 mr-1' />
            Open in new window
          </Button>
        )}
      </div>
    </div>
  );
};
