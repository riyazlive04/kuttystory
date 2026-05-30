import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class BooksService {
  constructor(private readonly db: DatabaseService) {}

  async createDraft(
    userId: string,
    storyTemplateId: string,
    childProfileId: string,
    language: 'ENGLISH' | 'TAMIL' | 'BILINGUAL',
  ) {
    // Verify the child profile exists and belongs to the user
    const child = await this.db.childProfile.findUnique({
      where: { id: childProfileId },
    });
    if (!child || child.userId !== userId) {
      throw new NotFoundException('Child profile not found');
    }

    return this.db.book.create({
      data: {
        userId,
        storyTemplateId,
        childProfileId,
        language,
        status: 'DRAFT',
      },
      include: {
        child: true,
        story: true,
      },
    });
  }

  async findById(id: string) {
    const book = await this.db.book.findUnique({
      where: { id },
      include: {
        child: true,
        story: true,
        pages: {
          orderBy: { pageNumber: 'asc' },
        },
      },
    });
    if (!book) {
      throw new NotFoundException('Book not found');
    }
    return book;
  }

  async findByUser(userId: string) {
    return this.db.book.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        child: true,
        story: true,
      },
    });
  }

  async updateStatus(id: string, status: string) {
    return this.db.book.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async getBookPages(bookId: string) {
    return this.db.bookPage.findMany({
      where: { bookId },
      orderBy: { pageNumber: 'asc' },
    });
  }

  async approveBook(bookId: string, userId: string) {
    const book = await this.db.book.findUnique({ where: { id: bookId } });
    if (!book) {
      throw new NotFoundException('Book not found');
    }
    if (book.userId !== userId) {
      throw new NotFoundException('Book not found');
    }

    return this.db.book.update({
      where: { id: bookId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
      },
    });
  }

  async requestPageRegen(bookPageId: string) {
    const page = await this.db.bookPage.findUnique({
      where: { id: bookPageId },
    });
    if (!page) {
      throw new NotFoundException('Book page not found');
    }

    return this.db.bookPage.update({
      where: { id: bookPageId },
      data: { status: 'REGEN_REQUESTED' },
    });
  }
}
