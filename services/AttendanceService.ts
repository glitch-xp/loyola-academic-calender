import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { StorageService } from './StorageService';
import { AttendanceData, SubjectAttendance } from '../types';

export const ATTENDANCE_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
export const REFRESH_COOLDOWN_MS = 5000;

const CACHE_KEY = 'erp_attendance_cache';
const CREDENTIALS_KEY = 'loyola_erp_credentials';

export const ERP_URLS = {
    login: 'https://erp.loyolacollege.edu/loyolaonline/students/loginManager/youLogin.jsp',
    home: 'https://erp.loyolacollege.edu/loyolaonline/students/template/HRDSystem.jsp',
    attendance: 'https://erp.loyolacollege.edu/loyolaonline/students/report/studentSubjectWiseAttendance.jsp',
} as const;

export interface SavedErpCredentials {
    deptNo: string;
    password: string;
}

export interface AttendanceCacheResult {
    data: AttendanceData | null;
    isExpired: boolean;
    expiresInMs: number;
}

export const AttendanceService = {
    async getCachedAttendance(): Promise<AttendanceCacheResult> {
        const data = await StorageService.getData<AttendanceData>(CACHE_KEY);
        if (!data || !data.fetchedAt) {
            return { data: null, isExpired: true, expiresInMs: 0 };
        }
        const age = Date.now() - data.fetchedAt;
        const isExpired = age >= ATTENDANCE_CACHE_TTL_MS;
        const expiresInMs = Math.max(0, ATTENDANCE_CACHE_TTL_MS - age);
        return { data, isExpired, expiresInMs };
    },

    async saveAttendanceCache(data: AttendanceData): Promise<void> {
        await StorageService.saveData(CACHE_KEY, data);
    },

    async clearAttendanceCache(): Promise<void> {
        await StorageService.removeData(CACHE_KEY);
    },

    async saveCredentials(deptNo: string, password: string): Promise<void> {
        if (Platform.OS === 'web') return;
        const payload: SavedErpCredentials = {
            deptNo: deptNo.trim(),
            password,
        };
        await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify(payload), {
            keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
    },

    async getCredentials(): Promise<SavedErpCredentials | null> {
        if (Platform.OS === 'web') return null;
        try {
            const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed.deptNo === 'string' && typeof parsed.password === 'string') {
                return parsed;
            }
            return null;
        } catch {
            return null;
        }
    },

    async clearCredentials(): Promise<void> {
        if (Platform.OS === 'web') return;
        try {
            await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
        } catch {
            // Ignore missing keychain entry
        }
    },

    formatDuration(ms: number): string {
        const totalMinutes = Math.max(0, Math.floor(ms / 60000));
        if (totalMinutes < 1) return 'just now';
        if (totalMinutes < 60) return `${totalMinutes}m`;
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    },
};

/**
 * Injected before page scripts run so ERP `alert(...)` calls are captured
 * instead of blocking the hidden WebView.
 */
export const WEBVIEW_BEFORE_CONTENT_JS = `
(function() {
  window.__erpLastAlert = '';
  var origAlert = window.alert;
  window.alert = function(msg) {
    window.__erpLastAlert = String(msg || '');
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'ERP_ALERT',
        message: window.__erpLastAlert
      }));
    }
    if (typeof origAlert === 'function' && false) { origAlert(msg); }
  };
})();
true;
`;

/**
 * Injected on load completion inside the WebView to inspect the current ERP page:
 * - Attendance report (#tblSubjectWiseAttendance) -> parses subject rows & totals
 * - Login form (#login_form) -> watches #tdCaptchText and notifies RN with the challenge
 * - Logged-in template (HRDSystem.jsp / studentProfile.jsp) -> notifies RN to load attendance
 */
export const WEBVIEW_INSPECT_PAGE_JS = `
(function() {
  if (!window.ReactNativeWebView) return;
  function post(payload) {
    window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  }
  function clean(text) {
    return String(text || '').replace(/\\u00a0/g, ' ').replace(/\\s+/g, ' ').trim();
  }

  var attTable = document.getElementById('tblSubjectWiseAttendance');
  if (attTable) {
    try {
      var rows = Array.prototype.slice.call(attTable.querySelectorAll('tr'));
      var periodFrom = '';
      var periodTo = '';
      var headerIdx = -1;

      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (r.className && r.className.indexOf('subheader1') !== -1) {
          var subCells = Array.prototype.slice.call(r.querySelectorAll('td')).map(function(td) { return clean(td.textContent); });
          for (var c = 0; c < subCells.length; c++) {
            if (subCells[c].toLowerCase().indexOf('during the period') !== -1) {
              periodFrom = subCells[c + 1] || '';
              periodTo = subCells[c + 3] || '';
              break;
            }
          }
        }
        if (r.className === 'subheader') {
          headerIdx = i;
          break;
        }
      }

      var headerRow = headerIdx >= 0 ? rows[headerIdx] : null;
      var headers = headerRow
        ? Array.prototype.slice.call(headerRow.children).map(function(td) { return clean(td.textContent).toLowerCase(); })
        : [];

      var codeIdx = 0;
      var nameIdx = 1;
      var totalIdx = 2;
      var absentIdx = -1;
      var presentIdx = -1;
      var pctIdx = headers.length > 0 ? headers.length - 1 : -1;
      var extraIndices = [];

      for (var h = 0; h < headers.length; h++) {
        var label = headers[h];
        if (label.indexOf('subject code') !== -1) codeIdx = h;
        else if (label.indexOf('subject description') !== -1) nameIdx = h;
        else if (label.indexOf('total') !== -1) totalIdx = h;
        else if (label === '*a' || label === 'a' || label === 'absent') absentIdx = h;
        else if (label === '*p' || label === 'p' || label === 'present') presentIdx = h;
        else if (label.indexOf('%') !== -1 || label.indexOf('attendance') !== -1) pctIdx = h;
        else if (h > 2) extraIndices.push(h);
      }

      var subjects = [];
      var sumTotal = 0;
      var sumPresent = 0;
      var sumAbsent = 0;

      for (var j = headerIdx + 1; j < rows.length; j++) {
        var cells = Array.prototype.slice.call(rows[j].children);
        if (cells.length < 4) continue;
        var code = clean(cells[codeIdx] ? cells[codeIdx].textContent : '');
        var name = clean(cells[nameIdx] ? cells[nameIdx].textContent : '');
        if (!code || !name) continue;
        if (code.toLowerCase().indexOf('total') !== -1) continue;

        var totalHrs = parseFloat(clean(cells[totalIdx] ? cells[totalIdx].textContent : '0')) || 0;
        var presentHrs = presentIdx >= 0 && cells[presentIdx] ? (parseFloat(clean(cells[presentIdx].textContent)) || 0) : 0;
        var absentHrs = absentIdx >= 0 && cells[absentIdx] ? (parseFloat(clean(cells[absentIdx].textContent)) || 0) : 0;
        var odMlHrs = 0;
        for (var e = 0; e < extraIndices.length; e++) {
          var exCell = cells[extraIndices[e]];
          if (exCell) odMlHrs += parseFloat(clean(exCell.textContent)) || 0;
        }
        var pctCell = pctIdx >= 0 && cells[pctIdx] ? cells[pctIdx] : cells[cells.length - 1];
        var pct = parseFloat(clean(pctCell ? pctCell.textContent : '0')) || 0;

        sumTotal += totalHrs;
        sumPresent += presentHrs;
        sumAbsent += absentHrs;

        subjects.push({
          code: code,
          name: name,
          totalHours: totalHrs,
          presentHours: presentHrs,
          absentHours: absentHrs,
          odMlHours: odMlHrs,
          percentage: pct
        });
      }

      var overallPct = sumTotal > 0 ? Math.round(((sumPresent / sumTotal) * 100) * 100) / 100 : 0;
      post({
        type: 'ATTENDANCE_DATA',
        data: {
          periodFrom: periodFrom || undefined,
          periodTo: periodTo || undefined,
          subjects: subjects,
          overallPercentage: overallPct,
          totalHours: sumTotal,
          presentHours: sumPresent,
          absentHours: sumAbsent,
          fetchedAt: Date.now()
        }
      });
    } catch (err) {
      post({ type: 'PARSE_ERROR', message: err && err.message ? err.message : 'Failed to parse attendance' });
    }
    return;
  }

  var loginForm = document.getElementById('login_form');
  if (loginForm) {
    var sentLogin = false;
    var attempts = 0;
    function checkCaptcha() {
      var td = document.getElementById('tdCaptchText');
      var txt = td ? clean(td.textContent) : '';
      var img = td ? td.querySelector('img') : null;
      if (txt || (img && img.src) || attempts >= 24) {
        if (sentLogin) return;
        sentLogin = true;
        post({
          type: 'LOGIN_REQUIRED',
          captchaText: txt,
          captchaImgSrc: img ? img.src : '',
          alertMessage: window.__erpLastAlert || ''
        });
        return;
      }
      attempts++;
      setTimeout(checkCaptcha, 250);
    }
    checkCaptcha();
    return;
  }

  if (location.href.indexOf('HRDSystem.jsp') !== -1 || location.href.indexOf('studentProfile.jsp') !== -1) {
    post({ type: 'LOGGED_IN', url: location.href });
    return;
  }

  post({
    type: 'UNKNOWN_PAGE',
    url: location.href,
    alertMessage: window.__erpLastAlert || ''
  });
})();
true;
`;

export function buildLoginSubmitJS(deptNo: string, password: string, captcha: string): string {
    const safeUser = JSON.stringify(deptNo.trim());
    const safePass = JSON.stringify(password);
    const safeCaptcha = JSON.stringify(captcha.trim());

    return `
(function() {
  window.__erpLastAlert = '';
  var u = document.getElementById('login');
  var p = document.getElementById('passwd');
  var c = document.getElementById('ccode');
  if (!u || !p || !c) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGIN_FORM_MISSING' }));
    }
    return;
  }
  u.value = ${safeUser};
  p.value = ${safePass};
  c.value = ${safeCaptcha};
  if (typeof funSave === 'function') {
    funSave();
  } else {
    var form = document.getElementById('login_form');
    if (form) form.submit();
  }
})();
true;
`;
}

/**
 * Pure helper to normalize subject names for cleaner display (e.g. Title Case from ALL CAPS).
 */
export function formatSubjectTitle(raw: string): string {
    const cleaned = raw.trim();
    if (!cleaned) return '';
    if (cleaned === cleaned.toUpperCase()) {
        return cleaned
            .toLowerCase()
            .replace(/\b([a-z])/g, (m) => m.toUpperCase());
    }
    return cleaned;
}

export interface AttendanceTheme {
    accent: string;
    cardBg: string;
    cardBorder: string;
    badgeBg: string;
    text: string;
    pillBg: string;
    pillText: string;
}

export function getAttendanceTheme(percentage: number): AttendanceTheme {
    if (percentage < 80) {
        return {
            accent: '#E11D48',
            cardBg: '#FFE4E6',
            cardBorder: '#FDA4AF',
            badgeBg: '#FECDD3',
            text: '#9F1239',
            pillBg: '#E11D48',
            pillText: '#FFFFFF',
        };
    }
    if (percentage <= 85) {
        return {
            accent: '#D97706',
            cardBg: '#FEF3C7',
            cardBorder: '#FCD34D',
            badgeBg: '#FDE68A',
            text: '#92400E',
            pillBg: '#B45309',
            pillText: '#FFFFFF',
        };
    }
    return {
        accent: '#059669',
        cardBg: '#DCFCE7',
        cardBorder: '#86EFAC',
        badgeBg: '#BBF7D0',
        text: '#065F46',
        pillBg: '#0F766E',
        pillText: '#FFFFFF',
    };
}

export function getAttendanceColor(percentage: number): string {
    return getAttendanceTheme(percentage).accent;
}

function normalizeSubjectName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function findSubjectAttendance(
    subject: { name?: string; code?: string },
    attendance: AttendanceData | null
): SubjectAttendance | null {
    if (!attendance || !attendance.subjects || attendance.subjects.length === 0) {
        return null;
    }

    const subCode = subject.code?.trim().toUpperCase();
    if (subCode && subCode !== 'NA') {
        const byCode = attendance.subjects.find(
            att => att.code.trim().toUpperCase() === subCode
        );
        if (byCode) return byCode;
    }

    const subName = subject.name ? normalizeSubjectName(subject.name) : '';
    if (!subName) return null;

    const exact = attendance.subjects.find(
        att => normalizeSubjectName(att.name) === subName
    );
    if (exact) return exact;

    if (subName.length >= 5) {
        const partial = attendance.subjects.find(att => {
            const attName = normalizeSubjectName(att.name);
            return attName.includes(subName) || subName.includes(attName);
        });
        if (partial) return partial;
    }

    return null;
}

export type { SubjectAttendance };
