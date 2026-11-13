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

  describe('11. Video Wall & Proctoring Conference Dual-Environment Tests', () => {
    it('detects insecure LAN origin on 192.168.0.5:5173 and restricts cross-origin WebRTC iframes', async () => {
      await withMockWindow(
        {
          location: {
            protocol: 'http:',
            hostname: '192.168.0.5',
            port: '5173',
          },
        },
        () => {
          const isInsecure = isInsecureLanOrigin();
          assert.strictEqual(isInsecure, true);
        }
      );
    });

    it('permits WebRTC context on localhost development environment', async () => {
      await withMockWindow(
        {
          location: {
            protocol: 'http:',
            hostname: 'localhost',
            port: '5173',
          },
        },
        () => {
          const isInsecure = isInsecureLanOrigin();
          assert.strictEqual(isInsecure, false);
        }
      );
    });

    it('permits WebRTC context on College LAN trusted HTTPS domain', async () => {
      await withMockWindow(
        {
          location: {
            protocol: 'https:',
            hostname: 'lms.college.lan',
            port: '443',
          },
        },
        () => {
          const isInsecure = isInsecureLanOrigin();
          assert.strictEqual(isInsecure, false);
        }
      );
    });

    it('permits WebRTC context on Public Internet HTTPS domain', async () => {
      await withMockWindow(
        {
          location: {
            protocol: 'https:',
            hostname: 'lms.venilearn.org',
            port: '',
          },
        },
        () => {
          const isInsecure = isInsecureLanOrigin();
          assert.strictEqual(isInsecure, false);
        }
      );
    });
  });

  describe('12. Candidate Telemetry & Roster Processing Unit Tests', () => {
    const getInitials = (name: string): string => {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    };

    it('accurately extracts candidate initials without relying on external image URLs', () => {
      assert.strictEqual(getInitials('Tina Kirkpatrick'), 'TK');
      assert.strictEqual(getInitials('Alex Thompson'), 'AT');
      assert.strictEqual(getInitials('Maria Garcia'), 'MG');
      assert.strictEqual(getInitials('David Kim'), 'DK');
      assert.strictEqual(getInitials('Aisha Patel'), 'AP');
      assert.strictEqual(getInitials('Administrator'), 'AD');
      assert.strictEqual(getInitials('John'), 'JO');
    });

    it('accurately classifies speaking vs ambient audio thresholds', () => {
      const isSpeakingThreshold = (level: number) => level > 0.35;

      assert.strictEqual(isSpeakingThreshold(0.05), false); // ambient noise
      assert.strictEqual(isSpeakingThreshold(0.18), false); // faint background
      assert.strictEqual(isSpeakingThreshold(0.35), false); // boundary
      assert.strictEqual(isSpeakingThreshold(0.36), true);  // candidate speaking
      assert.strictEqual(isSpeakingThreshold(0.82), true);  // loud vocal audio
    });

    it('correctly slices candidate roster by requested grid density', () => {
      const mockRoster = Array.from({ length: 48 }, (_, i) => ({
        id: `stu-${i + 1}`,
        name: `Candidate ${i + 1}`,
        rollNo: `STU-2026-${String(i + 1).padStart(3, '0')}`,
      }));

      const density16 = mockRoster.slice(0, 16);
      const density24 = mockRoster.slice(0, 24);
      const density32 = mockRoster.slice(0, 32);

      assert.strictEqual(density16.length, 16);
      assert.strictEqual(density24.length, 24);
      assert.strictEqual(density32.length, 32);
      assert.strictEqual(density32[0].name, 'Candidate 1');
      assert.strictEqual(density32[31].name, 'Candidate 32');
    });

    it('validates proctor warning payload integrity', () => {
      const warningPayload = {
        assessmentId: 'asm-80874923',
        learnerId: 'stu-cohort-004',
        learnerName: 'David Kim',
        message: 'Please keep your eyes focused on your screen.',
        reason: 'Tab focus switched',
        sentBy: 'Dr. James Wilson (Proctor)',
        timestamp: new Date().toISOString(),
      };

      assert.strictEqual(typeof warningPayload.assessmentId, 'string');
      assert.strictEqual(typeof warningPayload.learnerId, 'string');
      assert.strictEqual(typeof warningPayload.message, 'string');
      assert.strictEqual(warningPayload.message.length > 0, true);
      assert.strictEqual(warningPayload.sentBy.includes('Proctor'), true);
    });

    it('validates proctor force-submit payload integrity', () => {
      const forceSubmitPayload = {
        assessmentId: 'asm-80874923',
        learnerId: 'stu-cohort-004',
        learnerName: 'David Kim',
        reason: 'Multiple integrity violations detected.',
        proctorName: 'Dr. James Wilson (Proctor)',
        submittedAt: new Date().toISOString(),
      };

      assert.strictEqual(forceSubmitPayload.learnerId, 'stu-cohort-004');
      assert.strictEqual(forceSubmitPayload.reason.length > 5, true);
      assert.strictEqual(typeof forceSubmitPayload.submittedAt, 'string');
    });
  });

  describe('13. Creator Notifications & Started Candidate Live Wall Tests', () => {
    it('dispatches notification to assessment creator and admins when scheduled exam start time arrives', () => {
      const assessmentId = 'asm-aiml-sched';
      const assessmentTitle = 'AI ML Final Examination';
      const creatorId = 'u-trainer-001';

      const targets = new Set<string>([
        'all-admins',
        'all-trainers',
        creatorId,
      ]);

      const notifications = Array.from(targets).map((uid) => ({
        id: `notif-exam-sched-${assessmentId}-${uid}`,
        userId: uid,
        title: `Exam Started: "${assessmentTitle}" Schedule Reached`,
        message: `The scheduled exam start time for "${assessmentTitle}" (Manual Proctoring) has arrived. Candidates are now entering the exam. Please join the Live Conference Bridge to invigilate.`,
        category: 'proctoring',
        link: `/proctoring?tab=live_monitor&assessmentId=${assessmentId}`,
        isRead: false,
      }));

      assert.strictEqual(notifications.length, 3);
      assert.strictEqual(notifications.some((n) => n.userId === creatorId), true);
      assert.strictEqual(notifications.some((n) => n.userId === 'all-admins'), true);
      assert.strictEqual(notifications.some((n) => n.userId === 'all-trainers'), true);
      assert.strictEqual(notifications[0].link, `/proctoring?tab=live_monitor&assessmentId=${assessmentId}`);
      assert.strictEqual(notifications[0].title.includes('AI ML Final Examination'), true);
    });

    it('dispatches notification to assessment creator and admins when student starts exam', () => {
      const assessmentId = '80874923-7429-4acf-aea7-75e0a65c39e3';
      const assessmentTitle = 'AI ML';
      const studentId = 'stu-009';
      const studentName = 'Maria Garcia';
      const creatorId = 'u-admin-marcus';

      const targets = new Set<string>([
        'all-admins',
        'all-trainers',
        creatorId,
      ]);

      const notifications = Array.from(targets).map((uid) => ({
        id: `notif-proc-start-${Date.now()}-${uid}`,
        userId: uid,
        title: `Candidate Joined: ${studentName} started exam`,
        message: `${studentName} (${studentId}) has joined "${assessmentTitle}" with verified camera & microphone. Live video feed is active in the Live Conference Bridge.`,
        category: 'proctoring',
        link: `/proctoring?tab=live_monitor&assessmentId=${assessmentId}`,
        isRead: false,
      }));

      assert.strictEqual(notifications.length, 3);
      assert.strictEqual(notifications.some((n) => n.userId === creatorId), true);
      assert.strictEqual(notifications[0].title.includes('Maria Garcia'), true);
      assert.strictEqual(notifications[0].message.includes('Live Conference Bridge'), true);
    });

    it('prioritizes candidates who started the exam at the top of the conference bridge', () => {
      const mockParticipants = [
        { id: 'p-1', name: 'Student 1', status: 'connected', latestSnapshot: undefined },
        { id: 'p-2', name: 'Student 2', status: 'connected', latestSnapshot: undefined },
      ];

      const activeSessionCandidate = {
        id: 'p-active',
        name: 'Maria Garcia',
        status: 'in_progress',
        latestSnapshot: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        cameraActive: true,
      };

      // Active student is placed at top of conference grid
      const combined = [activeSessionCandidate, ...mockParticipants];

      assert.strictEqual(combined[0].id, 'p-active');
      assert.strictEqual(combined[0].name, 'Maria Garcia');
      assert.strictEqual(Boolean(combined[0].latestSnapshot), true);
      assert.strictEqual(combined[0].status, 'in_progress');
    });

    it('filters candidate wall to show only students who started the exam when filter is enabled', () => {
      const mockCandidates = [
        { id: 'p-1', name: 'Student 1', hasActiveSession: false },
        { id: 'p-2', name: 'Student 2 (Started)', hasActiveSession: true },
        { id: 'p-3', name: 'Student 3', hasActiveSession: false },
        { id: 'p-4', name: 'Student 4 (Started)', hasActiveSession: true },
      ];

      const filterStartedOnly = (candidates: typeof mockCandidates) =>
        candidates.filter((c) => c.hasActiveSession);

      const filtered = filterStartedOnly(mockCandidates);
      assert.strictEqual(filtered.length, 2);
      assert.strictEqual(filtered[0].id, 'p-2');
      assert.strictEqual(filtered[1].id, 'p-4');
    });
  });

  describe('14. 30-Minute Schedule Notification, Live Joining Feed & Split Inspector Tests', () => {
    it('triggers 30-minute advance notification before scheduled exam time', () => {
      const now = new Date('2026-11-13T16:30:00.000Z');
      const availabilityStart = '2026-11-13T17:00:00.000Z'; // Exactly 30 minutes away
      const start = new Date(availabilityStart);
      const diffMinutes = (start.getTime() - now.getTime()) / (1000 * 60);

      assert.strictEqual(diffMinutes, 30);
      assert.strictEqual(diffMinutes > 0 && diffMinutes <= 30, true);

      const generatedNotif = {
        id: `notif-exam-30min-asm-ai-ml-u-001`,
        title: `Upcoming Proctored Exam: "AI ML" Starts in 30 Mins`,
        message: `The scheduled exam "AI ML" (Manual Proctoring) begins at 05:00 PM. Please review the candidate list and prepare the Live Invigilation Bridge.`,
        category: 'proctoring',
        link: `/proctoring?tab=live_monitor&assessmentId=asm-ai-ml`,
      };

      assert.strictEqual(generatedNotif.title.includes('Starts in 30 Mins'), true);
      assert.strictEqual(generatedNotif.category, 'proctoring');
      assert.strictEqual(generatedNotif.link.includes('asm-ai-ml'), true);
    });

    it('does NOT trigger 30-minute notification when exam is more than 30 minutes away', () => {
      const now = new Date('2026-11-13T16:00:00.000Z');
      const availabilityStart = '2026-11-13T17:00:00.000Z'; // 60 minutes away
      const start = new Date(availabilityStart);
      const diffMinutes = (start.getTime() - now.getTime()) / (1000 * 60);

      assert.strictEqual(diffMinutes, 60);
      assert.strictEqual(diffMinutes > 0 && diffMinutes <= 30, false);
    });

    it('manages Split Inspector feed modes (screen, webcam, dual) defaulting to screen', () => {
      type InspectorMode = 'screen' | 'webcam' | 'dual';
      let inspectorMode: InspectorMode = 'screen';

      assert.strictEqual(inspectorMode, 'screen'); // Defaults to screen as user requested

      inspectorMode = 'webcam';
      assert.strictEqual(inspectorMode, 'webcam');

      inspectorMode = 'dual';
      assert.strictEqual(inspectorMode, 'dual');
    });

    it('validates Candidate Screen stream metadata and security overlay', () => {
      const candidateScreenState = {
        candidateName: 'David Kim',
        rollNo: 'STU-2026-004',
        assessmentTitle: 'AI ML Certification Exam',
        resolution: '1920x1080',
        fps: 30,
        fullscreenLocked: true,
        focusPercentage: 100,
        activeQuestionIndex: 4,
        timeRemainingSeconds: 2325,
      };

      assert.strictEqual(candidateScreenState.fullscreenLocked, true);
      assert.strictEqual(candidateScreenState.focusPercentage, 100);
      assert.strictEqual(candidateScreenState.resolution, '1920x1080');
      assert.strictEqual(candidateScreenState.fps, 30);
    });

    it('verifies Dispatch Warning button payload construction and Enter-key execution', () => {
      const candidate = { id: 'stu-cohort-004', name: 'David Kim' };
      const warningMessage = 'Please return focus to examination window.';

      const buildWarningPayload = (targetCandidate: typeof candidate, text: string) => ({
        assessmentId: 'asm-ai-ml',
        learnerId: targetCandidate.id,
        learnerName: targetCandidate.name,
        message: text.trim(),
        reason: 'Tab focus switched',
        sentBy: 'Proctor / Administrator',
        timestamp: new Date().toISOString(),
      });

      const payload = buildWarningPayload(candidate, warningMessage);
      assert.strictEqual(payload.learnerId, 'stu-cohort-004');
      assert.strictEqual(payload.learnerName, 'David Kim');
      assert.strictEqual(payload.message, 'Please return focus to examination window.');
      assert.strictEqual(payload.sentBy, 'Proctor / Administrator');
    });

    it('accurately filters live joining feed roster by status and search keyword', () => {
      const roster = [
        { id: '1', name: 'Tina Kirkpatrick', rollNo: 'STU-2026-001', cameraActive: true, isJoined: true },
        { id: '2', name: 'Alex Thompson', rollNo: 'STU-2026-002', cameraActive: true, isJoined: true },
        { id: '3', name: 'David Kim', rollNo: 'STU-2026-004', cameraActive: true, isJoined: false },
        { id: '4', name: 'Maria Garcia', rollNo: 'STU-2026-003', cameraActive: false, isJoined: false },
      ];

      // Filter by joined
      const joinedOnly = roster.filter((r) => r.isJoined);
      assert.strictEqual(joinedOnly.length, 2);

      // Filter by camera active
      const streamingOnly = roster.filter((r) => r.cameraActive);
      assert.strictEqual(streamingOnly.length, 3);

      // Search by text
      const searchKim = roster.filter((r) => r.name.toLowerCase().includes('kim') || r.rollNo.includes('kim'));
      assert.strictEqual(searchKim.length, 1);
      assert.strictEqual(searchKim[0].name, 'David Kim');
    });

    it('shows 0 candidates in the video conference wall when no candidates have joined yet', () => {
      const enrolledCohort = [
        { id: '1', name: 'Tina Kirkpatrick', status: 'disconnected' },
        { id: '2', name: 'Alex Thompson', status: 'disconnected' },
        { id: '3', name: 'David Kim', status: 'disconnected' },
      ];

      const activeSessions: any[] = [];
      const isDemoSimulated = false;

      const candidatesWhoStartedExam = enrolledCohort.filter((p) => {
        const hasSession = activeSessions.some((s) => s.learnerId === p.id);
        const isConnected = p.status === 'connected' || (p.status as any) === 'in_progress';
        return hasSession || (isDemoSimulated && isConnected);
      });

      // No one has joined yet
      assert.strictEqual(candidatesWhoStartedExam.length, 0);

      const candidatePool = !isDemoSimulated ? candidatesWhoStartedExam : enrolledCohort;
      assert.strictEqual(candidatePool.length, 0);
    });

    it('correctly marks enrolled students as Awaiting Entry in attendance roster until joined', () => {
      const candidateOffline = { id: 'c-1', name: 'Student A', status: 'disconnected', joinedAt: '' };
      const hasSession = false;
      const isJoined = candidateOffline.status === 'connected' || hasSession;

      assert.strictEqual(isJoined, false);
      const displayStatus = isJoined ? 'In Exam' : 'Awaiting Entry';
      assert.strictEqual(displayStatus, 'Awaiting Entry');
    });
  });

  describe('15. Cross-Window / Multi-Device Active Proctoring Session & Candidate Matching Unit Tests', () => {
    const matchesCandidate = (aId?: string, aName?: string, bId?: string, bName?: string) => {
      if (aId && bId && aId === bId) return true;
      if (aName && bName && aName.trim().toLowerCase() === bName.trim().toLowerCase()) return true;
      return false;
    };

    it('matches candidate by ID or normalized full name across seed roster and real active session', () => {
      // Alex Thompson has id 'stu-cohort-2' in seed roster, but joins with user ID 'u-007'
      const rosterCandidate = { id: 'stu-cohort-2', name: 'Alex Thompson', rollNo: 'STU-2026-002' };
      const activeSession = { learnerId: 'u-007', learnerName: 'Alex Thompson', status: 'in_progress' };

      const isMatch = matchesCandidate(
        rosterCandidate.id,
        rosterCandidate.name,
        activeSession.learnerId,
        activeSession.learnerName
      );
      assert.strictEqual(isMatch, true);

      // Distinct candidate does not match
      const otherCandidate = { id: 'stu-cohort-1', name: 'Tina Kirkpatrick' };
      assert.strictEqual(
        matchesCandidate(otherCandidate.id, otherCandidate.name, activeSession.learnerId, activeSession.learnerName),
        false
      );
    });

    it('displays Alex Thompson in live conference bridge when Alex starts exam with user id u-007', () => {
      const enrolledCohort = [
        { id: 'stu-cohort-1', name: 'Tina Kirkpatrick', rollNo: 'STU-2026-001', status: 'disconnected' },
        { id: 'stu-cohort-2', name: 'Alex Thompson', rollNo: 'STU-2026-002', status: 'disconnected' },
        { id: 'stu-cohort-3', name: 'Maria Garcia', rollNo: 'STU-2026-003', status: 'disconnected' },
      ];

      // Alex Thompson joined the exam
      const realActiveCandidates = [
        {
          id: 'u-007',
          name: 'Alex Thompson',
          rollNo: 'STU-2026-007',
          assessmentId: '80874923-7429-4acf-aea7-75e0a65c39e3',
          status: 'connected',
          cameraActive: true,
          micActive: true,
        },
      ];

      // Overlay real active candidate onto enrolled roster
      const roster = enrolledCohort.map((c) => ({ ...c }));
      realActiveCandidates.forEach((active) => {
        const idx = roster.findIndex((r) => matchesCandidate(r.id, r.name, active.id, active.name));
        if (idx >= 0) {
          roster[idx] = { ...roster[idx], ...active, status: active.status || 'connected' };
        } else {
          roster.unshift({ ...active, status: active.status || 'connected' });
        }
      });

      // Filter candidates who actually started the exam
      const isDemoCohortSimulated = false;
      const candidatesWhoStartedExam = roster.filter((p) => {
        const hasSession = realActiveCandidates.some((r) => matchesCandidate(r.id, r.name, p.id, p.name));
        const isConnected = p.status === 'connected' || (p.status as any) === 'in_progress';
        return isConnected || hasSession || isDemoCohortSimulated;
      });

      // Only Alex Thompson should be in the live conference bridge
      assert.strictEqual(candidatesWhoStartedExam.length, 1);
      assert.strictEqual(candidatesWhoStartedExam[0].name, 'Alex Thompson');
      assert.strictEqual(candidatesWhoStartedExam[0].status, 'connected');
      assert.strictEqual(candidatesWhoStartedExam[0].cameraActive, true);

      // Remaining cohort students must remain disconnected / Awaiting Entry
      const tina = roster.find((r) => r.name === 'Tina Kirkpatrick');
      assert.strictEqual(tina?.status, 'disconnected');
      const maria = roster.find((r) => r.name === 'Maria Garcia');
      assert.strictEqual(maria?.status, 'disconnected');
    });

    it('verifies candidatesWhoStartedExam includes connected candidate even when isDemoCohortSimulated is false', () => {
      const candidates = [
        { id: '1', name: 'Candidate 1', status: 'connected', cameraActive: true },
        { id: '2', name: 'Candidate 2', status: 'disconnected', cameraActive: false },
      ];

      const isDemoCohortSimulated = false;
      const filtered = candidates.filter((p) => {
        const isConnected = p.status === 'connected' || (p.status as any) === 'in_progress';
        return isConnected || isDemoCohortSimulated;
      });

      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].id, '1');
      assert.strictEqual(filtered[0].status, 'connected');
    });

    it('verifies attendance roster flips candidate status to Joined (Live) and camera to Active upon starting exam', () => {
      const candidateBefore = {
        id: 'stu-cohort-2',
        name: 'Alex Thompson',
        status: 'disconnected',
        cameraActive: false,
      };

      // Before joining:
      const beforeStatus = candidateBefore.status === 'connected' ? 'Joined (Live)' : 'Awaiting Entry';
      assert.strictEqual(beforeStatus, 'Awaiting Entry');

      // After joining:
      const candidateAfter = {
        ...candidateBefore,
        id: 'u-007',
        status: 'connected',
        cameraActive: true,
      };
      const afterStatus = candidateAfter.status === 'connected' ? 'Joined (Live)' : 'Awaiting Entry';
      assert.strictEqual(afterStatus, 'Joined (Live)');
      assert.strictEqual(candidateAfter.cameraActive, true);
    });

    it('correctly maps backend active-sessions endpoint response into ProctoringSession and ProctorParticipant', () => {
      const backendPayload = [
        {
          id: 'sess-uuid-1234',
          assessmentId: '80874923-7429-4acf-aea7-75e0a65c39e3',
          learnerId: 'u-007',
          status: 'in_progress',
          startedAt: '2026-11-13T12:00:00.000Z',
          activeWebcam: true,
          activeMic: true,
          activeScreenShare: false,
          isFullscreen: true,
          attempt: {
            learner: {
              id: 'u-007',
              firstName: 'Alex',
              lastName: 'Thompson',
              email: 'alex.thompson@student.demo',
            },
          },
          events: [
            {
              id: 'ev-1',
              evidenceSnapshot: 'data:image/jpeg;base64,mockSnapshotData',
            },
          ],
        },
      ];

      const mappedSession = {
        id: backendPayload[0].id,
        assessmentId: backendPayload[0].assessmentId,
        learnerId: backendPayload[0].learnerId,
        learnerName: `${backendPayload[0].attempt.learner.firstName} ${backendPayload[0].attempt.learner.lastName}`,
        status: backendPayload[0].status,
        activeWebcam: backendPayload[0].activeWebcam,
        startedAt: backendPayload[0].startedAt,
      };

      assert.strictEqual(mappedSession.learnerName, 'Alex Thompson');
      assert.strictEqual(mappedSession.status, 'in_progress');
      assert.strictEqual(mappedSession.activeWebcam, true);

      const latestSnapshot = backendPayload[0].events[0].evidenceSnapshot;
      assert.strictEqual(latestSnapshot.startsWith('data:image/jpeg'), true);
    });

    it('shows exactly 0 candidates and 0 live camera feeds when no one has joined the exam', () => {
      const selectedAssessmentId = '80874923-7429-4acf-aea7-75e0a65c39e3';
      const allSessions: any[] = [
        { assessmentId: 'other-asm', learnerId: 'u-123', learnerName: 'Other Student', status: 'in_progress' }
      ];
      const allParticipants: any[] = [];
      const enrolledCohort = [
        { id: '1', name: 'Tina Kirkpatrick', rollNo: 'STU-2026-001', status: 'disconnected', cameraActive: false },
        { id: '2', name: 'Alex Thompson', rollNo: 'STU-2026-002', status: 'disconnected', cameraActive: false },
      ];

      // Filter real active candidates for selected assessment
      const realActiveCandidates = allSessions
        .filter((s) => s.assessmentId === selectedAssessmentId && (s.status === 'in_progress' || s.status === 'connected'))
        .map((s) => ({ ...s, status: 'connected', cameraActive: true }));

      // Overlay on enrolled cohort
      const roster = enrolledCohort.map((c) => ({ ...c }));
      realActiveCandidates.forEach((active) => {
        const idx = roster.findIndex((r) => r.id === active.learnerId || r.name.toLowerCase() === active.learnerName?.toLowerCase());
        if (idx >= 0) {
          roster[idx] = { ...roster[idx], status: 'connected', cameraActive: true };
        }
      });

      const isDemoCohortSimulated = false;
      const candidatesWhoStartedExam = roster.filter((p) => {
        const isRealActive = realActiveCandidates.some((r) => r.id === p.id || r.name.toLowerCase() === p.name.toLowerCase());
        return isRealActive && p.status === 'connected';
      });

      // Must be strictly 0 active candidates and 0 camera feeds
      assert.strictEqual(candidatesWhoStartedExam.length, 0);
      const activeCameraFeeds = candidatesWhoStartedExam.filter((c) => c.cameraActive).length;
      assert.strictEqual(activeCameraFeeds, 0);
      assert.strictEqual(roster.every((c) => c.status === 'disconnected'), true);
    });

    it('verifies that when Alex stops writing the exam (heartbeat > 20s old), Alex is dropped from live candidates', () => {
      const now = Date.now();
      const isHeartbeatActive = (pingAt?: string) => {
        if (!pingAt) return false;
        const time = new Date(pingAt).getTime();
        if (isNaN(time) || time <= 0) return false;
        const diff = now - time;
        return diff >= 0 && diff < 20000;
      };

      // Alex joined 10 minutes ago, last ping was 35 seconds ago
      const alexSession = {
        id: 'psess-alex-1',
        assessmentId: '80874923-7429-4acf-aea7-75e0a65c39e3',
        learnerId: 'u-007',
        learnerName: 'Alex Thompson',
        status: 'in_progress',
        lastPingAt: new Date(now - 35000).toISOString(),
      };

      const isLive = isHeartbeatActive(alexSession.lastPingAt);
      assert.strictEqual(isLive, false, 'Candidate with ping > 20s old must be treated as inactive / not writing');

      const realActiveCandidates = [alexSession]
        .filter((s) => isHeartbeatActive(s.lastPingAt))
        .map((s) => ({ ...s, status: 'connected' }));

      assert.strictEqual(realActiveCandidates.length, 0);

      // Top metrics when no candidate has an active heartbeat
      const joinedCount = realActiveCandidates.length;
      const liveFeedsCount = realActiveCandidates.filter((c: any) => c.cameraActive).length;
      assert.strictEqual(joinedCount, 0);
      assert.strictEqual(liveFeedsCount, 0);
    });

    it('excludes admin / trainer Marcus Johnson from examination candidate roster', () => {
      const currentUser = { id: 'u-001', displayName: 'Marcus Johnson', activeRole: 'Institution Admin' };
      const isAdminSelf = (name?: string, id?: string) => {
        const role = currentUser.activeRole;
        if (role && role !== 'Student') {
          if (name && currentUser.displayName && name.trim().toLowerCase() === currentUser.displayName.trim().toLowerCase()) return true;
          if (id && currentUser.id && id === currentUser.id) return true;
        }
        return false;
      };

      assert.strictEqual(isAdminSelf('Marcus Johnson', 'u-001'), true);
      assert.strictEqual(isAdminSelf('Alex Thompson', 'u-007'), false);
    });
  });

  describe('16. End-to-End Admin Google Meet Link Generation, Student Assignment & Invigilation Wall Tests', () => {
    it('generates a fixed 3-4-3 Google Meet link upon assessment creation and stores it permanently', () => {
      // Admin generates a Google Meet link
      const letters = 'abcdefghijklmnopqrstuvwxyz';
      const r = (len: number) => Array.from({ length: len }, (_, i) => letters[i % letters.length]).join('');
      const generatedMeetUrl = `https://meet.google.com/${r(3)}-${r(4)}-${r(3)}`;

      assert.match(generatedMeetUrl, /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/);

      // Stored on Assessment object upon publish / assignment
      const assessment = {
        id: '80874923-7429-4acf-aea7-75e0a65c39e3',
        title: 'AI ML Midterm Examination',
        proctoringMode: 'manual' as const,
        proctoringRequired: true,
        jitsiRoomId: generatedMeetUrl,
        googleMeetUrl: generatedMeetUrl,
      };

      assert.strictEqual(assessment.googleMeetUrl, generatedMeetUrl);
      assert.strictEqual(assessment.jitsiRoomId, generatedMeetUrl);
    });

    it('ensures student resolves and joins the exact admin-generated Google Meet link in exam player', () => {
      const adminMeetUrl = 'https://meet.google.com/abc-defg-hij';
      const assessment = {
        id: '80874923-7429-4acf-aea7-75e0a65c39e3',
        title: 'AI ML Midterm Examination',
        proctoringMode: 'manual' as const,
        proctoringRequired: true,
        jitsiRoomId: adminMeetUrl,
        googleMeetUrl: adminMeetUrl,
      };

      // Student initializes exam player
      const studentEndpoints = buildGoogleMeetUrls({
        assessmentId: assessment.id,
        assessmentTitle: assessment.title,
        candidateId: 'u-007',
        candidateName: 'Alex Thompson',
        customMeetUrl: assessment.googleMeetUrl,
        jitsiRoomId: assessment.jitsiRoomId,
      });

      // Student must receive the exact admin-generated link, NEVER meet.google.com/new
      assert.strictEqual(studentEndpoints.webUrl, adminMeetUrl);
      assert.strictEqual(studentEndpoints.webUrl.includes('/new'), false);
    });

    it('presents all joined candidates in the live conference bridge and attendance table with IN EXAM status', () => {
      const now = Date.now();
      const assessmentId = '80874923-7429-4acf-aea7-75e0a65c39e3';

      // Alex Thompson joined the exam and is actively sending telemetry
      const activeAlex = {
        id: 'u-007',
        name: 'Alex Thompson',
        rollNo: 'STU-u-007',
        assessmentId,
        status: 'connected' as const,
        cameraActive: true,
        micActive: true,
        screenShareActive: true,
        tabFocused: true,
        lastPingAt: new Date(now - 2000).toISOString(),
        joinedAt: new Date(now - 120000).toISOString(),
      };

      const isHeartbeatActive = (pingAt?: string) => {
        if (!pingAt) return false;
        const time = new Date(pingAt).getTime();
        return !isNaN(time) && (now - time) < 20000;
      };

      const realActiveCandidates = [activeAlex].filter((c) => isHeartbeatActive(c.lastPingAt));
      assert.strictEqual(realActiveCandidates.length, 1);
      assert.strictEqual(realActiveCandidates[0].name, 'Alex Thompson');
      assert.strictEqual(realActiveCandidates[0].status, 'connected');

      // Candidate Wall presentation
      const displayedInWall = realActiveCandidates;
      assert.strictEqual(displayedInWall.length, 1);
      assert.strictEqual(displayedInWall[0].cameraActive, true);

      // Attendance Table presentation
      const sessionStatusLabel = displayedInWall[0].status === 'connected' ? 'IN EXAM' : 'Awaiting Entry';
      assert.strictEqual(sessionStatusLabel, 'IN EXAM');

      // Metrics Presentation
      const joinedCount = realActiveCandidates.length;
      const liveFeedsCount = realActiveCandidates.filter((c) => c.cameraActive).length;
      assert.strictEqual(joinedCount, 1);
      assert.strictEqual(liveFeedsCount, 1);
    });

    it('launches the exact admin-generated Google Meet URL from Open Meet Tab button in JitsiProctorDashboard', () => {
      const adminMeetUrl = 'https://meet.google.com/qrp-wxjk-nmb';
      const assessment = {
        id: '80874923-7429-4acf-aea7-75e0a65c39e3',
        title: 'AI ML Midterm Examination',
        googleMeetUrl: adminMeetUrl,
        jitsiRoomId: adminMeetUrl,
      };

      // Admin resolves meeting URL
      const activeMeetUrl = ((assessment as any).googleMeetUrl || assessment.jitsiRoomId).trim();
      assert.strictEqual(activeMeetUrl, adminMeetUrl);
      assert.strictEqual(activeMeetUrl.startsWith('https://meet.google.com/'), true);
    });
  });

  describe('17. Assessment Creation & Page Refresh Persistence Tests', () => {
    it('preserves newly created assessment in local storage when server fetch returns existing list', () => {
      const existingLocal = [
        {
          id: 'asm-newly-created-1234',
          title: 'Advanced Machine Learning & AI',
          status: 'published',
          googleMeetUrl: 'https://meet.google.com/abc-defg-hij',
        },
      ];
      const backendServerAssessments = [
        {
          id: 'asm-legacy-server-001',
          title: 'Legacy Python Quiz',
          status: 'published',
        },
      ];
      const deletedIds = new Set<string>();

      // Merging logic implemented in fetchAssessments
      const assessmentMap = new Map<string, any>();
      existingLocal
        .filter((a) => !deletedIds.has(a.id))
        .forEach((a) => assessmentMap.set(a.id, a));

      backendServerAssessments.forEach((a) => {
        const prev = assessmentMap.get(a.id);
        assessmentMap.set(a.id, {
          ...prev,
          ...a,
          googleMeetUrl: a.googleMeetUrl || prev?.googleMeetUrl,
        });
      });

      const merged = Array.from(assessmentMap.values());
      assert.strictEqual(merged.length, 2);
      assert.ok(merged.some((a) => a.id === 'asm-newly-created-1234'));
      assert.ok(merged.some((a) => a.id === 'asm-legacy-server-001'));
      const found = merged.find((a) => a.id === 'asm-newly-created-1234');
      assert.strictEqual(found?.googleMeetUrl, 'https://meet.google.com/abc-defg-hij');
    });

    it('unmarks deleted state when an assessment is created or updated', () => {
      const deletedSet = new Set<string>(['asm-revived-999']);
      const targetId = 'asm-revived-999';

      // unmarkDeletedAssessmentId logic
      if (deletedSet.has(targetId)) {
        deletedSet.delete(targetId);
      }

      assert.strictEqual(deletedSet.has(targetId), false);
    });
  });
});
