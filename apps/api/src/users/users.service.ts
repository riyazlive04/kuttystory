import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findById(id: string) {
    return this.db.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  /**
   * Save contact details on the current (often guest) user. Captured at the
   * preview step so the sales team can follow up on people who generated a
   * preview but haven't ordered yet.
   */
  async updateContact(
    userId: string,
    data: { name?: string; phone?: string; email?: string },
  ) {
    const update: { name?: string; phone?: string; email?: string } = {};
    if (data.name?.trim()) update.name = data.name.trim();
    if (data.phone?.trim()) update.phone = data.phone.trim();
    // email is unique; only set it if it's free (or already ours) so a guest
    // reusing an email can't crash the request on a unique-constraint error.
    if (data.email?.trim()) {
      const email = data.email.trim().toLowerCase();
      const existing = await this.db.user.findUnique({ where: { email } });
      if (!existing || existing.id === userId) {
        update.email = email;
      }
    }
    if (Object.keys(update).length === 0) {
      return this.db.user.findUnique({ where: { id: userId } });
    }
    return this.db.user.update({ where: { id: userId }, data: update });
  }

  async getChildProfiles(userId: string) {
    return this.db.childProfile.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createChildProfile(
    userId: string,
    data: {
      name: string;
      nickname?: string;
      gender: 'BOY' | 'GIRL' | 'PREFER_NOT_TO_SAY';
      ageYears: number;
      skinTone?: string;
      hairColor?: string;
      hasGlasses?: boolean;
      referencePhotoUrls?: string[];
    },
  ) {
    return this.db.childProfile.create({
      data: {
        userId,
        ...data,
        referencePhotoUrls: data.referencePhotoUrls || [],
      },
    });
  }

  async updateChildProfile(
    id: string,
    userId: string,
    data: Partial<{
      name: string;
      nickname: string;
      skinTone: string;
      hairColor: string;
      hasGlasses: boolean;
      referencePhotoUrls: string[];
    }>,
  ) {
    return this.db.childProfile.update({
      where: { id, userId },
      data,
    });
  }

  async exportUserData(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        childProfiles: true,
        orders: { include: { items: true } },
        reviews: true,
      },
    });
    return user;
  }

  async deleteUser(userId: string) {
    await this.db.user.delete({ where: { id: userId } });
  }
}
