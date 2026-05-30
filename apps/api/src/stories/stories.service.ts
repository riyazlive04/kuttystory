import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class StoriesService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(filters?: {
    theme?: string;
    ageMin?: number;
    ageMax?: number;
    search?: string;
  }) {
    const where: Record<string, unknown> = { isActive: true };

    if (filters?.theme) {
      where.theme = filters.theme;
    }
    if (filters?.ageMin !== undefined || filters?.ageMax !== undefined) {
      if (filters.ageMin !== undefined) {
        where.ageMin = { lte: filters.ageMin };
      }
      if (filters.ageMax !== undefined) {
        where.ageMax = { gte: filters.ageMax };
      }
    }
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.db.storyTemplate.findMany({
      where: where as any,
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  async findBySlug(slug: string) {
    return this.db.storyTemplate.findUnique({
      where: { slug },
      include: {
        pages: {
          orderBy: { pageNumber: 'asc' },
        },
      },
    });
  }

  async findById(id: string) {
    return this.db.storyTemplate.findUnique({
      where: { id },
      include: {
        pages: {
          orderBy: { pageNumber: 'asc' },
        },
      },
    });
  }

  async getPreviewPages(storyTemplateId: string) {
    return this.db.storyPageTemplate.findMany({
      where: { storyTemplateId, isPreviewPage: true },
      orderBy: { pageNumber: 'asc' },
    });
  }

  async getFeatured() {
    return this.db.storyTemplate.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
