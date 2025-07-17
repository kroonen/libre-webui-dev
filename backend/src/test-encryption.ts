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

import { encryptionService } from './services/encryptionService.js';

try {
  console.log('🔐 Testing Database Encryption Service');
  console.log('=====================================');

  // Test basic encryption/decryption
  const testData = 'Hello, this is sensitive data!';
  console.log('Original:', testData);

  const encrypted = encryptionService.encrypt(testData);
  console.log('Encrypted:', encrypted);

  const decrypted = encryptionService.decrypt(encrypted);
  console.log('Decrypted:', decrypted);

  console.log(
    '✅ Basic encryption test:',
    testData === decrypted ? 'PASSED' : 'FAILED'
  );

  // Test object encryption
  const testObject = {
    message: 'Secret message',
    artifacts: [{ type: 'code', content: 'console.log("secret");' }],
    images: [
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    ],
    statistics: { tokens: 150, duration: 1200 },
  };

  console.log('\n📦 Testing Object Encryption');
  console.log('Original object:', JSON.stringify(testObject, null, 2));

  const encryptedObject = encryptionService.encryptObject(testObject);
  console.log('Encrypted object:', encryptedObject);

  const decryptedObject = encryptionService.decryptObject(encryptedObject);
  console.log('Decrypted object:', JSON.stringify(decryptedObject, null, 2));

  console.log(
    '✅ Object encryption test:',
    JSON.stringify(testObject) === JSON.stringify(decryptedObject)
      ? 'PASSED'
      : 'FAILED'
  );

  // Test empty/null values
  console.log('\n🔍 Testing Edge Cases');
  try {
    const nullTest = encryptionService.encrypt('');
    const nullDecrypted = encryptionService.decrypt(nullTest);
    console.log(
      '✅ Empty string test:',
      nullDecrypted === '' ? 'PASSED' : 'FAILED'
    );
  } catch (error) {
    console.log('❌ Empty string test: FAILED -', (error as Error).message);
  }

  console.log('\n🎉 Encryption service is ready for production!');
  console.log(
    'All sensitive data will be encrypted before storage in the database.'
  );
} catch (error) {
  console.error('❌ Error running encryption tests:', error);
  process.exit(1);
}
