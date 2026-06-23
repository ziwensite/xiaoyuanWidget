import { WidgetConfig } from '../../types';
import { BaseWidget } from '../base';
import { t } from '../../i18n';
import { applyFilters } from '../../utils/StyleUtils';

export class TagCloudWidget extends BaseWidget {
  getType(): string { return 'tag-cloud'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    const app = (window as any).app;
    if (!app) return;

    const vault = app.vault;
    const minCount = (config.settings.minCount as number) ?? 1;

    let files = vault.getMarkdownFiles() as any[];
    files = applyFilters(files, config.filters);
    const cache = app.metadataCache;
    const tagCount = new Map<string, number>();

    for (const file of files) {
      const metadata = cache.getFileCache(file);
      if (!metadata) continue;

      const seen = new Set<string>();

      const processTag = (tag: string) => {
        const cleanTag = String(tag).replace(/^#/, '');
        if (!cleanTag || seen.has(cleanTag)) return;
        seen.add(cleanTag);
        tagCount.set(cleanTag, (tagCount.get(cleanTag) ?? 0) + 1);
      };

      if (metadata.frontmatter?.tags) {
        const tags = metadata.frontmatter.tags;
        const tagArr = Array.isArray(tags) ? tags : [tags];
        for (const tag of tagArr) processTag(tag);
      }

      if (metadata.tags) {
        for (const t of metadata.tags) processTag(t.tag);
      }
    }

    const sorted = Array.from(tagCount.entries())
      .filter(([_, count]) => count >= minCount)
      .sort((a, b) => b[1] - a[1]);

    container.addClass('xyw-tag-cloud');
    if (config.title) {
      container.createEl('div', { cls: 'xyw-card-title', text: config.title });
    }

    if (!sorted.length) {
      container.createEl('div', { cls: 'xyw-empty', text: t('msg-no-data') });
      return;
    }

    const maxCount = sorted[0][1];
    const wrapper = container.createEl('div', { cls: 'xyw-tags-wrapper' });

    for (const [tag, count] of sorted) {
      const size = 0.8 + (count / maxCount) * 1.2;
      const el = wrapper.createEl('span', {
        cls: 'xyw-tag-item',
        text: `#${tag}`,
      });
      el.style.fontSize = `${size}em`;
      el.setAttr('title', `${tag} (${count})`);
      el.addEventListener('click', () => {
        (window as any).app.internalPlugins.getPluginById('global-search')?.instance?.openGlobalSearch(`#${tag}`, true);
      });
    }
  }
}