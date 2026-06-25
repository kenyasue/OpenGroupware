import { ValidationError } from '@/lib/errors';
import type { Locale, Theme } from '@/lib/types';
import { VALID_LOCALES, VALID_THEMES } from '@/lib/i18n/constants';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;
const MIN_PASSWORD_LENGTH = 8;
const MAX_AVATAR_URL_LENGTH = 500;

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ProfileUpdateInput {
  name?: string;
  email?: string;
  avatarUrl?: string;
  theme?: Theme;
  locale?: Locale;
}

export function validateRegister(input: RegisterInput): void {
  validateName(input.name);
  validateEmail(input.email);
  validatePassword(input.password);
}

export function validateLogin(input: LoginInput): void {
  if (!input.email) {
    throw new ValidationError('メールアドレスを入力してください', 'email');
  }
  if (!input.password) {
    throw new ValidationError('パスワードを入力してください', 'password');
  }
}

export function validateProfileUpdate(input: ProfileUpdateInput): void {
  if (
    input.name === undefined &&
    input.email === undefined &&
    input.avatarUrl === undefined &&
    input.theme === undefined &&
    input.locale === undefined
  ) {
    throw new ValidationError('更新対象のフィールドを指定してください');
  }
  if (input.name !== undefined) validateName(input.name);
  if (input.email !== undefined) validateEmail(input.email);
  if (
    input.avatarUrl !== undefined &&
    input.avatarUrl.length > MAX_AVATAR_URL_LENGTH
  ) {
    throw new ValidationError(
      `アイコン画像URLは${MAX_AVATAR_URL_LENGTH}文字以内で入力してください`,
      'avatarUrl'
    );
  }
  if (input.theme !== undefined && !VALID_THEMES.includes(input.theme)) {
    throw new ValidationError('無効なテーマです', 'theme');
  }
  if (input.locale !== undefined && !VALID_LOCALES.includes(input.locale)) {
    throw new ValidationError('無効な言語です', 'locale');
  }
}

function validateName(name: string): void {
  if (!name || !name.trim()) {
    throw new ValidationError('表示名を入力してください', 'name');
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new ValidationError(
      `表示名は${MAX_NAME_LENGTH}文字以内で入力してください`,
      'name'
    );
  }
}

function validateEmail(email: string): void {
  if (!email) {
    throw new ValidationError('メールアドレスを入力してください', 'email');
  }
  if (!EMAIL_RE.test(email)) {
    throw new ValidationError(
      'メールアドレスの形式が正しくありません',
      'email'
    );
  }
}

function validatePassword(password: string): void {
  if (!password) {
    throw new ValidationError('パスワードを入力してください', 'password');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(
      `パスワードは${MIN_PASSWORD_LENGTH}文字以上で入力してください`,
      'password'
    );
  }
}
