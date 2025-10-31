/**
 * PROOF OF CONCEPT: Chrome Prompt API + LiveKit STT
 *
 * This file contains PoC tests to validate Chrome Prompt API compatibility
 * with LiveKit audio streams before full implementation.
 *
 * USAGE:
 * 1. Ensure Chrome Canary with AI flags enabled
 * 2. Import this file in a test component
 * 3. Run tests manually to validate approach
 * 4. Document results below before proceeding to full implementation
 */

import { RemoteAudioTrack } from 'livekit-client';
import { checkChromeAI, initializePromptAPI, transcribeAudio } from '../lib/chromeAI';

export interface PoCResult {
  test: string;
  success: boolean;
  latency?: number;
  notes: string;
  error?: string;
}

/**
 * POC TEST 1: Verify Chrome AI Availability
 */
export async function pocTest1_CheckAvailability(): Promise<PoCResult> {
  const startTime = performance.now();

  try {
    const capabilities = await checkChromeAI();
    const latency = performance.now() - startTime;

    return {
      test: 'Chrome AI Availability Check',
      success: capabilities.isAvailable,
      latency,
      notes: `Status: ${capabilities.status}. ${capabilities.error || 'API available'}`,
    };
  } catch (error) {
    return {
      test: 'Chrome AI Availability Check',
      success: false,
      notes: 'Failed to check availability',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * POC TEST 2: Initialize Prompt API
 */
export async function pocTest2_InitializeAPI(): Promise<PoCResult> {
  const startTime = performance.now();

  try {
    const model = await initializePromptAPI('You are a speech-to-text assistant.');
    const latency = performance.now() - startTime;

    if (!model) {
      return {
        test: 'Prompt API Initialization',
        success: false,
        latency,
        notes: 'Model initialization returned null',
      };
    }

    return {
      test: 'Prompt API Initialization',
      success: true,
      latency,
      notes: 'Prompt API model created successfully',
    };
  } catch (error) {
    return {
      test: 'Prompt API Initialization',
      success: false,
      notes: 'Failed to initialize',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * POC TEST 3: Audio Chunking with MediaRecorder
 */
export async function pocTest3_AudioChunking(
  audioTrack: RemoteAudioTrack,
  chunkDurationMs: number = 1000
): Promise<PoCResult> {
  return new Promise((resolve) => {
    try {
      const mediaStream = audioTrack.mediaStream;
      if (!mediaStream) {
        resolve({
          test: `Audio Chunking (${chunkDurationMs}ms)`,
          success: false,
          notes: 'Audio track has no media stream',
        });
        return;
      }

      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType: 'audio/webm',
      });

      let chunkCount = 0;
      const startTime = performance.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunkCount++;
          console.log(`Audio chunk ${chunkCount} received:`, event.data.size, 'bytes');

          // Stop after first chunk for PoC
          if (chunkCount === 1) {
            mediaRecorder.stop();
            const latency = performance.now() - startTime;

            resolve({
              test: `Audio Chunking (${chunkDurationMs}ms)`,
              success: true,
              latency,
              notes: `Successfully captured ${chunkCount} chunk(s). Size: ${event.data.size} bytes`,
            });
          }
        }
      };

      mediaRecorder.onerror = (error) => {
        resolve({
          test: `Audio Chunking (${chunkDurationMs}ms)`,
          success: false,
          notes: 'MediaRecorder error',
          error: String(error),
        });
      };

      mediaRecorder.start(chunkDurationMs);

      // Timeout after 5 seconds
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
          resolve({
            test: `Audio Chunking (${chunkDurationMs}ms)`,
            success: false,
            notes: 'Timeout - no audio data received',
          });
        }
      }, 5000);
    } catch (error) {
      resolve({
        test: `Audio Chunking (${chunkDurationMs}ms)`,
        success: false,
        notes: 'Failed to create MediaRecorder',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

/**
 * POC TEST 4: End-to-End STT Pipeline
 * Tests audio capture → Prompt API → transcription
 */
export async function pocTest4_EndToEndSTT(
  audioTrack: RemoteAudioTrack,
  chunkDurationMs: number = 1000
): Promise<PoCResult> {
  const overallStart = performance.now();

  try {
    // Initialize model
    const model = await initializePromptAPI();
    if (!model) {
      return {
        test: 'End-to-End STT',
        success: false,
        notes: 'Failed to initialize Prompt API',
      };
    }

    // Capture audio chunk
    const audioChunk = await new Promise<Blob>((resolve, reject) => {
      const mediaStream = audioTrack.mediaStream;
      if (!mediaStream) {
        reject(new Error('Audio track has no media stream'));
        return;
      }

      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType: 'audio/webm',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          resolve(event.data);
          mediaRecorder.stop();
        }
      };

      mediaRecorder.onerror = (error) => reject(error);

      mediaRecorder.start();

      setTimeout(() => {
        mediaRecorder.stop();
        reject(new Error('Timeout - no audio captured'));
      }, chunkDurationMs + 1000);
    });

    const captureLatency = performance.now() - overallStart;

    // Transcribe audio
    const transcribeStart = performance.now();
    const transcription = await transcribeAudio(audioChunk, model);
    const transcribeLatency = performance.now() - transcribeStart;

    const totalLatency = performance.now() - overallStart;

    model.destroy();

    return {
      test: 'End-to-End STT',
      success: true,
      latency: totalLatency,
      notes: `Capture: ${captureLatency.toFixed(0)}ms, Transcribe: ${transcribeLatency.toFixed(0)}ms, Total: ${totalLatency.toFixed(0)}ms. Result: "${transcription}"`,
    };
  } catch (error) {
    return {
      test: 'End-to-End STT',
      success: false,
      latency: performance.now() - overallStart,
      notes: 'Pipeline failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run all PoC tests in sequence
 */
export async function runAllPoCTests(audioTrack?: RemoteAudioTrack): Promise<PoCResult[]> {
  const results: PoCResult[] = [];

  console.log('=== Starting Chrome AI + LiveKit STT PoC Tests ===');

  // Test 1: Availability
  console.log('\n[Test 1] Checking Chrome AI availability...');
  const test1 = await pocTest1_CheckAvailability();
  results.push(test1);
  console.log(test1);

  if (!test1.success) {
    console.warn('⚠️ Chrome AI not available. Skipping remaining tests.');
    return results;
  }

  // Test 2: Initialize API
  console.log('\n[Test 2] Initializing Prompt API...');
  const test2 = await pocTest2_InitializeAPI();
  results.push(test2);
  console.log(test2);

  if (!test2.success) {
    console.warn('⚠️ Failed to initialize API. Skipping audio tests.');
    return results;
  }

  // Tests requiring audio track
  if (!audioTrack) {
    console.warn('⚠️ No audio track provided. Skipping audio-based tests.');
    console.log('\nTo run full PoC:');
    console.log('1. Join a LiveKit room with another participant');
    console.log('2. Pass RemoteAudioTrack to runAllPoCTests(audioTrack)');
    return results;
  }

  // Test 3: Audio chunking (test multiple chunk sizes)
  for (const chunkSize of [500, 1000, 1500, 2000]) {
    console.log(`\n[Test 3.${chunkSize}] Testing ${chunkSize}ms audio chunking...`);
    const test3 = await pocTest3_AudioChunking(audioTrack, chunkSize);
    results.push(test3);
    console.log(test3);
  }

  // Test 4: End-to-end STT
  console.log('\n[Test 4] Testing end-to-end STT pipeline...');
  const test4 = await pocTest4_EndToEndSTT(audioTrack, 1000);
  results.push(test4);
  console.log(test4);

  console.log('\n=== PoC Tests Complete ===');
  console.log('Results:', results);

  return results;
}

/**
 * Generate PoC results markdown report
 */
export function generatePoCReport(results: PoCResult[]): string {
  const timestamp = new Date().toISOString();

  let report = `# Chrome Prompt API + LiveKit STT - PoC Results\n\n`;
  report += `**Date:** ${timestamp}\n\n`;
  report += `**Environment:**\n`;
  report += `- Browser: ${navigator.userAgent}\n`;
  report += `- Test Count: ${results.length}\n\n`;

  report += `## Test Results\n\n`;

  results.forEach((result, index) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    report += `### ${index + 1}. ${result.test} - ${status}\n\n`;

    if (result.latency !== undefined) {
      report += `- **Latency:** ${result.latency.toFixed(2)}ms\n`;
    }
    report += `- **Notes:** ${result.notes}\n`;

    if (result.error) {
      report += `- **Error:** ${result.error}\n`;
    }

    report += `\n`;
  });

  // Summary
  const passCount = results.filter((r) => r.success).length;
  const failCount = results.length - passCount;

  report += `## Summary\n\n`;
  report += `- **Total Tests:** ${results.length}\n`;
  report += `- **Passed:** ${passCount}\n`;
  report += `- **Failed:** ${failCount}\n\n`;

  if (failCount === 0) {
    report += `## Recommendation\n\n`;
    report += `✅ All tests passed. Proceed with full STT implementation.\n`;
  } else {
    report += `## Recommendation\n\n`;
    report += `⚠️ Some tests failed. Review errors before proceeding.\n`;
  }

  return report;
}
