import { describe, expect, it } from 'vitest';
import {
  hasMediaAccess,
  MEDIA_PERMISSION_TYPES,
  resolveMediaAccessPrivileges,
} from './mediaAccess';

describe('media access privileges', () => {
  it('treats a legacy granted response as full access', () => {
    expect(resolveMediaAccessPrivileges({ granted: true })).toBe('all');
  });

  it('preserves full access', () => {
    expect(resolveMediaAccessPrivileges({ granted: true, accessPrivileges: 'all' })).toBe('all');
  });

  it('preserves limited access as valid media access', () => {
    const response = { granted: true, accessPrivileges: 'limited' as const };

    expect(resolveMediaAccessPrivileges(response)).toBe('limited');
    expect(hasMediaAccess(response)).toBe(true);
  });

  it('does not allow media queries when access is denied', () => {
    expect(resolveMediaAccessPrivileges({ granted: false, accessPrivileges: 'none' })).toBe('none');
    expect(hasMediaAccess({ granted: false, accessPrivileges: 'none' })).toBe(false);
  });

  it('does not treat a contradictory none privilege as media access', () => {
    expect(hasMediaAccess({ granted: true, accessPrivileges: 'none' })).toBe(false);
  });

  it('requests only photo and video permissions', () => {
    expect(MEDIA_PERMISSION_TYPES).toEqual(['photo', 'video']);
  });
});
