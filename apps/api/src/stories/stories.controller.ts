import { Controller, Get, Param, Query } from '@nestjs/common';
import { StoriesService } from './stories.service';
import { Public } from '../auth/auth.guard';

@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Get()
  @Public()
  async list(
    @Query('theme') theme?: string,
    @Query('ageMin') ageMin?: string,
    @Query('ageMax') ageMax?: string,
    @Query('search') search?: string,
  ) {
    const stories = await this.storiesService.findAll({
      theme,
      ageMin: ageMin ? parseInt(ageMin, 10) : undefined,
      ageMax: ageMax ? parseInt(ageMax, 10) : undefined,
      search,
    });
    return { success: true, data: stories };
  }

  @Get('featured')
  @Public()
  async featured() {
    const stories = await this.storiesService.getFeatured();
    return { success: true, data: stories };
  }

  @Get(':slug')
  @Public()
  async getBySlug(@Param('slug') slug: string) {
    const story = await this.storiesService.findBySlug(slug);
    if (!story) {
      return { success: false, error: 'Story not found' };
    }
    return { success: true, data: story };
  }

  @Get(':slug/preview-pages')
  @Public()
  async getPreviewPages(@Param('slug') slug: string) {
    const story = await this.storiesService.findBySlug(slug);
    if (!story) {
      return { success: false, error: 'Story not found' };
    }
    const pages = await this.storiesService.getPreviewPages(story.id);
    return { success: true, data: pages };
  }
}
