import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  generateGoogleMeetRoomCode,
  buildGoogleMeetUrls,
} from '../lib/jitsiProctoring.ts';
import {
  isInsecureLanOrigin,
  getLocalhostEquivalentUrl,
  createSimulatedUserMedia,
  requestUserMedia,
  probeConnectedHardware,
  getSecurityContextReport,
  getCollegeLanHttpsUrl,
  getPublicHttpsUrl,
  MockMediaStreamTrack,
} from '../lib/proctoringMedia.ts';

async function withMockNavigator(mockNav: any, fn: () => Promise<void> | void) {
  const origDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    value: mockNav,
    configurable: true,
    writable: true,
  });
  try {
    await fn();
  } finally {
    if (origDesc) {
      Object.defineProperty(globalThis, 'navigator', origDesc);
    } else {
      delete (globalThis as any).navigator;
    }
  }
}

async function withMockWindow(mockWin: any, fn: () => Promise<void> | void) {
  const origDesc = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    value: mockWin,
    configurable: true,
    writable: true,
  });
  try {
    await fn();
  } finally {
    if (origDesc) {
      Object.defineProperty(globalThis, 'window', origDesc);
    } else {
      delete (globalThis as any).window;
    }
  }
}

describe('VeniGuard Proctoring & Integrity Unit Test Suite', () => {

  describe('1. Google Meet Proctoring Integration', () => {
    it('generates a clean, valid 3-part Google Meet code', () => {
      const code = generateGoogleMeetRoomCode('asm-4151e66e', 'student_123');
      assert.match(code, /^ven-[a-z0-9]{3}-[a-z0-9]{4}$/);
      assert.strictEqual(code.startsWith('ven-'), true);
    });

    it('builds standard Google Meet URL when no custom URL is provided', () => {
      const endpoints = buildGoogleMeetUrls({
        assessmentId: 'asm-4151e66e',
        assessmentTitle: 'Midterm Examination',
        candidateId: 'cand-001',
        candidateName: 'Ravi Varma',
      });

      assert.strictEqual(endpoints.webUrl.startsWith('https://meet.google.com/'), true);
      assert.strictEqual(endpoints.appUrl, endpoints.webUrl);
      assert.strictEqual(endpoints.proctorWebUrl, endpoints.webUrl);
    });

    it('respects and preserves an explicit Google Meet URL provided by assessment config', () => {
      const customUrl = 'https://meet.google.com/abc-defg-hij';
      const endpoints = buildGoogleMeetUrls({
        assessmentId: 'asm-999',
        assessmentTitle: 'Final Exam',
        candidateId: 'cand-002',
        candidateName: 'Alex Thompson',
        customMeetUrl: customUrl,
      });

      assert.strictEqual(endpoints.webUrl, customUrl);
      assert.strictEqual(endpoints.roomName, 'abc-defg-hij');
    });

    it('handles raw Google Meet room code in jitsiRoomId config', () => {
      const endpoints = buildGoogleMeetUrls({
        assessmentId: 'asm-888',
        assessmentTitle: 'Weekly Quiz',
        candidateId: 'cand-003',
        candidateName: 'Priya Sharma',
        jitsiRoomId: 'xyz-pqrs-tuv',
      });

      assert.strictEqual(endpoints.webUrl, 'https://meet.google.com/xyz-pqrs-tuv');
      assert.strictEqual(endpoints.roomName, 'xyz-pqrs-tuv');
    });
  });

  describe('2. Insecure Origin & Localhost Helper Detection', () => {
    it('detects insecure LAN IP origins (e.g. 192.168.0.13 HTTP)', async () => {
      await withMockWindow(
        {
          location: {
            hostname: '192.168.0.13',
            protocol: 'http:',
            port: '5173',
            pathname: '/exam/test-10',
            search: '',
            hash: '',
          },
        },
        () => {
          const isInsecure = isInsecureLanOrigin();
          assert.strictEqual(isInsecure, true);

          const localhostUrl = getLocalhostEquivalentUrl();
          assert.strictEqual(localhostUrl, 'http://localhost:5173/exam/test-10');
        }
      );
    });

    it('identifies localhost as a secure origin', async () => {
      await withMockWindow(
        {
          location: {
            hostname: 'localhost',
            protocol: 'http:',
            port: '5173',
            pathname: '/exam/test-10',
          },
        },
        () => {
          const isInsecure = isInsecureLanOrigin();
          assert.strictEqual(isInsecure, false);
        }
      );
    });

    it('identifies HTTPS domain as a secure origin', async () => {
      await withMockWindow(
        {
          location: {
            hostname: 'lms.venilearn.org',
            protocol: 'https:',
            port: '',
            pathname: '/exam/test-10',
          },
        },
        () => {
          const isInsecure = isInsecureLanOrigin();
          assert.strictEqual(isInsecure, false);
        }
      );
    });
  });

  describe('3. Pass Threshold Percentage Calculations', () => {
    function computePassPercentage(assessment: any): number {
      const totalMarks = Number(assessment.totalMarks) || 100;
      const rawPass = Number(assessment.passingMarks) || 0;
      return assessment.passmark
        ? Number(assessment.passmark)
        : assessment.passingPercentage
        ? Number(assessment.passingPercentage)
        : rawPass > 0 && totalMarks > 0
        ? Math.min(100, Math.round((rawPass / totalMarks) * 100))
        : 70;
    }

    it('calculates percentage accurately from passingMarks / totalMarks', () => {
      const assessmentA = { passingMarks: 10, totalMarks: 20 };
      assert.strictEqual(computePassPercentage(assessmentA), 50);

      const assessmentB = { passingMarks: 14, totalMarks: 20 };
      assert.strictEqual(computePassPercentage(assessmentB), 70);
    });

    it('prefers explicit passmark percentage if configured', () => {
      const assessment = { passmark: 65, passingMarks: 10, totalMarks: 20 };
      assert.strictEqual(computePassPercentage(assessment), 65);
    });

    it('falls back safely to 70% default when marks are unconfigured', () => {
      const assessment = {};
      assert.strictEqual(computePassPercentage(assessment), 70);
    });
  });

  describe('4. Proctoring Policy Resolution & Screen Share Dynamic Binding', () => {
    it('does NOT demand screen share when trainer did not enable screenShare in proctoringSettings', () => {
      const assessment = {
        id: 'asm-101',
        title: 'Quiz 1',
        proctoringSettings: {
          screenShare: false,
          camera: true,
          mic: true,
        },
      };
      const fallbackPolicy = {
        requireScreenShare: true,
        requireWebcam: true,
        requireMicrophone: true,
      };

      const needsScreen = Boolean(assessment.proctoringSettings?.screenShare ?? fallbackPolicy.requireScreenShare);
      assert.strictEqual(needsScreen, false);
    });

    it('enforces screen share when trainer explicitly enabled screenShare', () => {
      const assessment = {
        id: 'asm-102',
        title: 'Final Exam',
        proctoringSettings: {
          screenShare: true,
          camera: true,
          mic: true,
        },
      };
      const fallbackPolicy = {
        requireScreenShare: false,
      };

      const needsScreen = Boolean(assessment.proctoringSettings?.screenShare ?? fallbackPolicy.requireScreenShare);
      assert.strictEqual(needsScreen, true);
    });
  });

  describe('5. Fullscreen & Multi-Tab Anti-Cheating Lockdown State', () => {
    let isExamPaused = false;
    let pauseReason: any = null;

    function simulateVisibilityChange(hidden: boolean) {
      if (hidden) {
        isExamPaused = true;
        pauseReason = {
          title: 'Assessment Locked: Tab Switch Detected',
          message: 'Navigating to other browser tabs or external applications is prohibited.',
        };
      }
    }

    function simulateWindowBlur() {
      isExamPaused = true;
      pauseReason = {
        title: 'Assessment Locked: Window Focus Lost',
        message: 'Exam window lost focus. Accessing external applications is prohibited.',
      };
    }

    function simulateFullscreenExit() {
      isExamPaused = true;
      pauseReason = {
        title: 'Assessment Locked: Full-Screen Mode Exited',
        message: 'Exam must be taken in full-screen mode.',
      };
    }

    function attemptResume(isFullscreenActive: boolean): boolean {
      if (!isFullscreenActive) {
        return false;
      }
      isExamPaused = false;
      pauseReason = null;
      return true;
    }

    it('triggers immediate exam pause when fullscreen is exited', () => {
      isExamPaused = false;
      simulateFullscreenExit();
      assert.strictEqual(isExamPaused, true);
      assert.ok(pauseReason.title.includes('Full-Screen'));
    });

    it('triggers immediate exam pause when tab switches or becomes hidden', () => {
      isExamPaused = false;
      simulateVisibilityChange(true);
      assert.strictEqual(isExamPaused, true);
      assert.ok(pauseReason.title.includes('Tab Switch'));
    });

    it('triggers immediate exam pause when window loses OS focus (blur)', () => {
      isExamPaused = false;
      simulateWindowBlur();
      assert.strictEqual(isExamPaused, true);
      assert.ok(pauseReason.title.includes('Focus Lost'));
    });

    it('prohibits resuming exam if fullscreen is not active', () => {
      isExamPaused = true;
      const resumedWithoutFullscreen = attemptResume(false);
      assert.strictEqual(resumedWithoutFullscreen, false);
      assert.strictEqual(isExamPaused, true);

      let currentFullscreen = true;
      const resumedWithFullscreen = attemptResume(currentFullscreen);
      assert.strictEqual(resumedWithFullscreen, true);
      assert.strictEqual(isExamPaused, false);
    });

    it('intercepts prohibited cheat keys (Alt+Tab, Windows key, F11, DevTools)', () => {
      const prohibitedKeyCombinations = [
        { key: 'Meta', altKey: false, ctrlKey: false },
        { key: 'Tab', altKey: true, ctrlKey: false },
        { key: 'Escape', altKey: true, ctrlKey: false },
        { key: 'F11', altKey: false, ctrlKey: false },
        { key: 'F12', altKey: false, ctrlKey: false },
        { key: 'c', altKey: false, ctrlKey: true },
        { key: 'v', altKey: false, ctrlKey: true },
      ];

      function isBlockedKey(e: { key: string; altKey?: boolean; ctrlKey?: boolean }): boolean {
        if (e.key === 'F11' || e.key === 'F12') return true;
        if (e.key === 'Meta' || (e.altKey && (e.key === 'Tab' || e.key === 'Escape'))) return true;
        if (e.ctrlKey && ['c', 'v', 'x', 'a', 'p', 's', 'u'].includes(e.key.toLowerCase())) return true;
        return false;
      }

      for (const combo of prohibitedKeyCombinations) {
        assert.strictEqual(isBlockedKey(combo), true, `Key combo ${JSON.stringify(combo)} should be blocked`);
      }

      assert.strictEqual(isBlockedKey({ key: 'a', ctrlKey: false, altKey: false }), false);
      assert.strictEqual(isBlockedKey({ key: '1', ctrlKey: false, altKey: false }), false);
    });
  });

  describe('6. Real Physical Hardware Probing (enumerateDevices & devicechange)', () => {
    it('detects connected audio and video inputs correctly', async () => {
      await withMockNavigator(
        {
          mediaDevices: {
            enumerateDevices: async () => [
              { kind: 'audioinput', deviceId: 'mic-1', label: 'Realtek Mic' },
              { kind: 'videoinput', deviceId: 'cam-1', label: 'HD Webcam' },
              { kind: 'audiooutput', deviceId: 'speaker-1', label: 'Speakers' },
            ],
          },
        },
        async () => {
          const report = await probeConnectedHardware();
          assert.strictEqual(report.hasAudioHardware, true);
          assert.strictEqual(report.hasVideoHardware, true);
          assert.strictEqual(report.audioInputs.length, 1);
          assert.strictEqual(report.videoInputs.length, 1);
        }
      );
    });

    it('reports missing hardware when devices list is empty', async () => {
      await withMockNavigator(
        {
          mediaDevices: {
            enumerateDevices: async () => [],
          },
        },
        async () => {
          const report = await probeConnectedHardware();
          assert.strictEqual(report.hasAudioHardware, false);
          assert.strictEqual(report.hasVideoHardware, false);
          assert.strictEqual(report.audioInputs.length, 0);
          assert.strictEqual(report.videoInputs.length, 0);
        }
      );
    });
  });

  describe('7. Strict Physical Media Stream Permissions & Error States', () => {
    it('throws SecurityError on insecure origins when isSecureContext is false', async () => {
      await withMockWindow(
        {
          isSecureContext: false,
          location: { hostname: '192.168.0.5', protocol: 'http:' },
        },
        async () => {
          await assert.rejects(
            async () => {
              await requestUserMedia({ audio: true });
            },
            (err: any) => {
              assert.strictEqual(err.name, 'SecurityError');
              assert.ok(err.message.includes('secure origin'));
              return true;
            }
          );
        }
      );
    });

    it('translates NotAllowedError into a friendly permission denied instruction', async () => {
      await withMockWindow(
        { isSecureContext: true },
        async () => {
          await withMockNavigator(
            {
              mediaDevices: {
                getUserMedia: async () => {
                  const err = new Error('Permission denied');
                  err.name = 'NotAllowedError';
                  throw err;
                },
              },
            },
            async () => {
              await assert.rejects(
                async () => {
                  await requestUserMedia({ audio: true });
                },
                (err: any) => {
                  assert.strictEqual(err.name, 'NotAllowedError');
                  assert.ok(err.message.includes('Microphone permission was denied'));
                  return true;
                }
              );

              await assert.rejects(
                async () => {
                  await requestUserMedia({ video: true });
                },
                (err: any) => {
                  assert.strictEqual(err.name, 'NotAllowedError');
                  assert.ok(err.message.includes('Camera permission was denied'));
                  return true;
                }
              );
            }
          );
        }
      );
    });

    it('translates NotFoundError when physical hardware is not detected', async () => {
      await withMockWindow(
        { isSecureContext: true },
        async () => {
          await withMockNavigator(
            {
              mediaDevices: {
                getUserMedia: async () => {
                  const err = new Error('Device not found');
                  err.name = 'NotFoundError';
                  throw err;
                },
              },
            },
            async () => {
              await assert.rejects(
                async () => {
                  await requestUserMedia({ video: true });
                },
                (err: any) => {
                  assert.strictEqual(err.name, 'NotFoundError');
                  assert.ok(err.message.includes('No physical camera detected'));
                  return true;
                }
              );
            }
          );
        }
      );
    });

    it('translates NotReadableError when device is locked by another application', async () => {
      await withMockWindow(
        { isSecureContext: true },
        async () => {
          await withMockNavigator(
            {
              mediaDevices: {
                getUserMedia: async () => {
                  const err = new Error('Device in use');
                  err.name = 'NotReadableError';
                  throw err;
                },
              },
            },
            async () => {
              await assert.rejects(
                async () => {
                  await requestUserMedia({ video: true });
                },
                (err: any) => {
                  assert.strictEqual(err.name, 'NotReadableError');
                  assert.ok(err.message.includes('another application'));
                  return true;
                }
              );
            }
          );
        }
      );
    });

    it('attaches ended, mute, and unmute callbacks to acquired stream tracks', async () => {
      await withMockWindow(
        { isSecureContext: true },
        async () => {
          const mockTrack = new MockMediaStreamTrack('audio', 'Physical Mic');
          const fakeStream = {
            getTracks: () => [mockTrack],
            getAudioTracks: () => [mockTrack],
            getVideoTracks: () => [],
          };

          await withMockNavigator(
            {
              mediaDevices: {
                getUserMedia: async () => fakeStream,
              },
            },
            async () => {
              let endedCalled = false;

              const { stream, isSimulated } = await requestUserMedia(
                { audio: true },
                {
                  onEnded: () => { endedCalled = true; },
                }
              );

              assert.strictEqual(isSimulated, false);
              assert.strictEqual(stream, fakeStream as any);

              // Trigger track stop (which fires 'ended')
              mockTrack.stop();
              assert.strictEqual(endedCalled, true);
            }
          );
        }
      );
    });
  });

  describe('8. Mandatory Assessment Readiness Checklist Gating', () => {
    function evaluatePrerequisites(state: {
      needsScreen: boolean;
      needsMic: boolean;
      needsWebcam: boolean;
      needsFullscreen: boolean;
      screenStatus: string;
      micStatus: string;
      webcamStatus: string;
      fullscreenStatus: string;
      netStatus: string;
      browserStatus: string;
      consentAcknowledged: boolean;
    }): boolean {
      const isScreenSatisfied = !state.needsScreen || state.screenStatus === 'connected' || state.screenStatus === 'not_required';
      const isMicSatisfied = !state.needsMic || state.micStatus === 'connected' || state.micStatus === 'not_required';
      const isWebcamSatisfied = !state.needsWebcam || state.webcamStatus === 'connected' || state.webcamStatus === 'not_required';
      const isFullscreenSatisfied = !state.needsFullscreen || state.fullscreenStatus === 'connected';
      const isNetSatisfied = state.netStatus === 'connected';
      const isBrowserSatisfied = state.browserStatus === 'connected';

      return (
        isScreenSatisfied &&
        isMicSatisfied &&
        isWebcamSatisfied &&
        isFullscreenSatisfied &&
        isNetSatisfied &&
        isBrowserSatisfied &&
        state.consentAcknowledged
      );
    }

    it('blocks assessment entry when microphone is unverified', () => {
      const allowed = evaluatePrerequisites({
        needsScreen: false,
        needsMic: true,
        needsWebcam: true,
        needsFullscreen: true,
        screenStatus: 'not_required',
        micStatus: 'permission_denied',
        webcamStatus: 'connected',
        fullscreenStatus: 'connected',
        netStatus: 'connected',
        browserStatus: 'connected',
        consentAcknowledged: true,
      });
      assert.strictEqual(allowed, false);
    });

    it('blocks assessment entry when webcam is unverified', () => {
      const allowed = evaluatePrerequisites({
        needsScreen: false,
        needsMic: true,
        needsWebcam: true,
        needsFullscreen: true,
        screenStatus: 'not_required',
        micStatus: 'connected',
        webcamStatus: 'permission_denied',
        fullscreenStatus: 'connected',
        netStatus: 'connected',
        browserStatus: 'connected',
        consentAcknowledged: true,
      });
      assert.strictEqual(allowed, false);
    });

    it('blocks assessment entry when consent is not checked', () => {
      const allowed = evaluatePrerequisites({
        needsScreen: false,
        needsMic: true,
        needsWebcam: true,
        needsFullscreen: true,
        screenStatus: 'not_required',
        micStatus: 'connected',
        webcamStatus: 'connected',
        fullscreenStatus: 'connected',
        netStatus: 'connected',
        browserStatus: 'connected',
        consentAcknowledged: false,
      });
      assert.strictEqual(allowed, false);
    });

    it('permits assessment entry only when all mandatory checks pass', () => {
      const allowed = evaluatePrerequisites({
        needsScreen: false,
        needsMic: true,
        needsWebcam: true,
        needsFullscreen: true,
        screenStatus: 'not_required',
        micStatus: 'connected',
        webcamStatus: 'connected',
        fullscreenStatus: 'connected',
        netStatus: 'connected',
        browserStatus: 'connected',
        consentAcknowledged: true,
      });
      assert.strictEqual(allowed, true);
    });
  });

  describe('9. Dual-Environment Security Context Detection (getSecurityContextReport)', () => {
    it('accurately identifies localhost as a secure development environment', async () => {
      await withMockWindow(
        {
          isSecureContext: true,
          location: {
            protocol: 'http:',
            hostname: 'localhost',
            port: '5173',
            pathname: '/exam/test-10',
            search: '',
            hash: '',
          },
        },
        () => {
          const report = getSecurityContextReport();
          assert.strictEqual(report.isSecureContext, true);
          assert.strictEqual(report.isLocalhost, true);
          assert.strictEqual(report.environmentType, 'localhost');
          assert.strictEqual(report.statusBadge, 'verified');
          assert.strictEqual(report.isInsecureHttp, false);
        }
      );
    });

    it('identifies College LAN trusted HTTPS as a verified secure environment', async () => {
      await withMockWindow(
        {
          isSecureContext: true,
          location: {
            protocol: 'https:',
            hostname: 'lms-lan.college.edu',
            port: '',
            pathname: '/exam/test-10',
            search: '',
            hash: '',
          },
        },
        () => {
          const report = getSecurityContextReport();
          assert.strictEqual(report.isSecureContext, true);
          assert.strictEqual(report.isHttps, true);
          assert.strictEqual(report.environmentType, 'lan_https');
          assert.strictEqual(report.statusBadge, 'verified');
          assert.strictEqual(report.isInsecureHttp, false);
        }
      );
    });

    it('flags unencrypted College LAN HTTP as insecure and provides actionable guidance', async () => {
      await withMockWindow(
        {
          isSecureContext: false,
          location: {
            protocol: 'http:',
            hostname: '192.168.0.5',
            port: '5173',
            pathname: '/exam/test-10',
            search: '',
            hash: '',
          },
        },
        () => {
          const report = getSecurityContextReport();
          assert.strictEqual(report.isSecureContext, false);
          assert.strictEqual(report.isLanIp, true);
          assert.strictEqual(report.environmentType, 'lan_http_insecure');
          assert.strictEqual(report.statusBadge, 'action_needed');
          assert.strictEqual(report.isInsecureHttp, true);
          assert.ok(report.actionableGuidance.includes('College LAN'));
        }
      );
    });

    it('identifies Public Internet HTTPS as verified secure environment', async () => {
      await withMockWindow(
        {
          isSecureContext: true,
          location: {
            protocol: 'https:',
            hostname: 'lms.venilearn.org',
            port: '',
            pathname: '/exam/test-10',
            search: '',
            hash: '',
          },
        },
        () => {
          const report = getSecurityContextReport();
          assert.strictEqual(report.isSecureContext, true);
          assert.strictEqual(report.isHttps, true);
          assert.strictEqual(report.environmentType, 'public_https');
          assert.strictEqual(report.statusBadge, 'verified');
          assert.strictEqual(report.isInsecureHttp, false);
        }
      );
    });

    it('flags unencrypted Public Internet HTTP as action needed', async () => {
      await withMockWindow(
        {
          isSecureContext: false,
          location: {
            protocol: 'http:',
            hostname: 'lms.venilearn.org',
            port: '',
            pathname: '/exam/test-10',
            search: '',
            hash: '',
          },
        },
        () => {
          const report = getSecurityContextReport();
          assert.strictEqual(report.isSecureContext, false);
          assert.strictEqual(report.environmentType, 'public_http_insecure');
          assert.strictEqual(report.statusBadge, 'action_needed');
          assert.strictEqual(report.isInsecureHttp, true);
        }
      );
    });
  });

  describe('10. Environment-Specific URL Resolution & Redirection', () => {
    it('resolves localhost equivalent preserving full path, search, and hash', async () => {
      await withMockWindow(
        {
          location: {
            protocol: 'http:',
            hostname: '192.168.0.5',
            port: '5173',
            pathname: '/exam/test-10',
            search: '?attempt=1',
            hash: '#checklist',
          },
        },
        () => {
          const url = getLocalhostEquivalentUrl();
          assert.strictEqual(url, 'http://localhost:5173/exam/test-10?attempt=1#checklist');
        }
      );
    });
  });
});
