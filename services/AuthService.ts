import bcrypt from 'bcrypt';
import { UserRepository } from '@/repositories/UserRepository';
import { createSessionToken } from '@/lib/auth/session';
import {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  type ProfileUpdateInput,
} from '@/lib/validators/userValidator';
import { ConflictError, UnauthorizedError, NotFoundError } from '@/lib/errors';
import type { User, UserRole } from '@/lib/types';

const BCRYPT_ROUNDS = 10;

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginResult {
  user: User;
  token: string;
}

/**
 * 認証・ユーザー管理の業務ロジックを担うService。
 * パスワードはbcryptでハッシュ化し、平文保存しない。
 * セッションCookieの設定はRoute Handler層の責務（AuthServiceはトークン生成まで）。
 */
export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  register(input: RegisterInput): User {
    validateRegister(input);
    const existing = this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('このメールアドレスは既に使用されています');
    }
    const passwordHash = bcrypt.hashSync(input.password, BCRYPT_ROUNDS);
    return this.userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'member',
    });
  }

  login(email: string, password: string): LoginResult {
    validateLogin({ email, password });
    const user = this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError(
        'メールアドレスまたはパスワードが正しくありません'
      );
    }
    if (user.status === 'inactive') {
      throw new UnauthorizedError('このアカウントは無効です');
    }
    if (
      !user.passwordHash ||
      !bcrypt.compareSync(password, user.passwordHash)
    ) {
      throw new UnauthorizedError(
        'メールアドレスまたはパスワードが正しくありません'
      );
    }
    return { user, token: createSessionToken(user.id) };
  }

  logout(): void {
    // セッションCookieの削除はRoute Handler層で行う
  }

  getCurrentUser(userId: number): User | null {
    return this.userRepository.findById(userId);
  }

  updateProfile(userId: number, input: ProfileUpdateInput): User {
    validateProfileUpdate(input);
    const user = this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    if (input.email && input.email !== user.email) {
      const existing = this.userRepository.findByEmail(input.email);
      if (existing) {
        throw new ConflictError('このメールアドレスは既に使用されています');
      }
    }
    const updated = this.userRepository.update(userId, {
      name: input.name,
      email: input.email,
      avatarUrl: input.avatarUrl,
    });
    if (!updated) {
      throw new NotFoundError('User', userId);
    }
    return updated;
  }

  /** テスト/初期データ用途: ロールを直接指定してユーザー作成 */
  createWithRole(input: RegisterInput, role: UserRole): User {
    validateRegister(input);
    const existing = this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('このメールアドレスは既に使用されています');
    }
    const passwordHash = bcrypt.hashSync(input.password, BCRYPT_ROUNDS);
    return this.userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role,
    });
  }
}
