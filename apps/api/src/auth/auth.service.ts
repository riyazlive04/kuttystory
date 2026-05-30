import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
      .toString('hex');
    return `${salt}:${hash}`;
  }

  async verifyPassword(password: string, stored: string): Promise<boolean> {
    const [salt, hash] = stored.split(':');
    const verify = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha512')
      .toString('hex');
    return hash === verify;
  }

  /**
   * Create an anonymous "guest" user + session so a visitor can generate and
   * store a book before signing up. The guest is upgraded in place (or its data
   * claimed) once they provide real credentials — see signup()/login().
   */
  async createGuest() {
    const user = await this.db.user.create({
      data: { isGuest: true, role: 'CUSTOMER' },
    });
    const token = await this.createSession(user.id);
    return { user, token };
  }

  /**
   * Move a guest's owned data onto a real account, then delete the guest.
   * Child profiles must be repointed before deletion (they cascade-delete with
   * their owner); books carry a plain userId scalar; orders are a real relation.
   */
  async claimGuestData(guestUserId: string, targetUserId: string) {
    if (guestUserId === targetUserId) return;
    const guest = await this.db.user.findUnique({ where: { id: guestUserId } });
    if (!guest || !guest.isGuest) return;

    await this.db.$transaction([
      this.db.childProfile.updateMany({
        where: { userId: guestUserId },
        data: { userId: targetUserId },
      }),
      this.db.book.updateMany({
        where: { userId: guestUserId },
        data: { userId: targetUserId },
      }),
      this.db.order.updateMany({
        where: { userId: guestUserId },
        data: { userId: targetUserId },
      }),
      this.db.user.delete({ where: { id: guestUserId } }),
    ]);
  }

  async createSession(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.db.session.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return token;
  }

  async validateSession(token: string) {
    const session = await this.db.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return session.user;
  }

  async deleteSession(token: string): Promise<void> {
    await this.db.session.deleteMany({ where: { token } });
  }

  async signup(
    email: string,
    password: string,
    name: string,
    phone?: string,
    guestUserId?: string,
  ) {
    const existing = await this.db.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error('Email already registered');
    }

    const passwordHash = await this.hashPassword(password);

    // If the visitor was a guest, upgrade that same record in place so any
    // book/child they already generated stays attached to the new account.
    let user;
    if (guestUserId) {
      const guest = await this.db.user.findUnique({
        where: { id: guestUserId },
      });
      if (guest?.isGuest) {
        user = await this.db.user.update({
          where: { id: guestUserId },
          data: { email, passwordHash, name, phone, isGuest: false },
        });
      }
    }
    if (!user) {
      user = await this.db.user.create({
        data: { email, passwordHash, name, phone },
      });
    }

    const token = await this.createSession(user.id);
    return { user, token };
  }

  async login(email: string, password: string, guestUserId?: string) {
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    const valid = await this.verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    // Returning customer who started as a guest this session: pull the guest's
    // generated data into their real account.
    if (guestUserId) {
      await this.claimGuestData(guestUserId, user.id);
    }

    const token = await this.createSession(user.id);
    return { user, token };
  }

  async findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    name: string;
  }) {
    let user = await this.db.user.findUnique({
      where: { googleId: profile.googleId },
    });

    if (!user) {
      user = await this.db.user.findUnique({
        where: { email: profile.email },
      });

      if (user) {
        user = await this.db.user.update({
          where: { id: user.id },
          data: { googleId: profile.googleId },
        });
      } else {
        user = await this.db.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            googleId: profile.googleId,
            emailVerified: new Date(),
          },
        });
      }
    }

    const token = await this.createSession(user.id);
    return { user, token };
  }
}
