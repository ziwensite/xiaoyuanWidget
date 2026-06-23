export function getCardStyleCSS(style: string, scope: string): string {
  if (!style || style === 'default') return '';
  const h = `.${scope}`;

  switch (style) {
    case 'none':
      return `${h} { padding: 0 !important; border: none !important; background: none !important; box-shadow: none !important; }`;

    case 'bordered':
      return `
${h} { padding: 12px 16px 36px; border: 1px solid var(--background-modifier-border); border-radius: 8px; background: var(--background-primary); overflow: hidden; transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out; }
${h}:hover { border-color: var(--interactive-accent); box-shadow: 0 2px 6px rgba(0,0,0,0.05); }
${h} .xyw-card-title { padding: 0; margin: 0 0 8px; font-weight: 600; }`;

    case 'shadow':
      return `
${h} { padding: 12px 16px 36px; border: 1px solid transparent; border-radius: 10px; background: var(--background-primary); box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease; }
${h}:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.1); }
${h} .xyw-card-title { padding: 0; margin: 0 0 8px; font-weight: 600; }`;

    default: return '';
  }
}

export function getContentStyleCSS(style: string, scope: string): string {
  if (!style || style === 'default') return '';
  const h = `.${scope}`;

  switch (style) {
    case 'clean':
      return `
${h} table.dataview.table-view-table { border-collapse: separate; border-spacing: 0; width: 100%; }
${h} table.dataview.table-view-table th { background: var(--background-secondary); padding: 10px 14px; font-weight: 600; font-size: 14px; text-align: left; border-bottom: 2px solid var(--background-modifier-border); }
${h} table.dataview.table-view-table td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid var(--background-modifier-border); transition: background 0.15s ease; }
${h} table.dataview.table-view-table tbody tr:nth-child(even) td { background: var(--background-primary-alt); }
${h} table.dataview.table-view-table tbody tr:hover td { background: var(--background-secondary); }
${h} ul li { padding: 6px 0; border-bottom: 1px dashed var(--background-modifier-border); }`;

    case 'minimal':
      return `
${h} table.dataview.table-view-table th, ${h} table.dataview.table-view-table td { padding: 6px 8px; border: none; }
${h} table.dataview.table-view-table th { font-weight: 700; color: var(--text-muted); font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
${h} table.dataview.table-view-table td { font-size: 13px; color: var(--text-normal); }
${h} ul { list-style: none; padding-left: 0; margin: 0; }
${h} ul li { padding: 4px 8px; margin: 2px 0; border-radius: 4px; transition: background 0.15s ease; }
${h} ul li:hover { background: var(--background-secondary); }`;

    case 'bordered':
      return `
${h} table.dataview.table-view-table { border-collapse: collapse; width: 100%; border-radius: 6px; overflow: hidden; border: 1px solid var(--background-modifier-border); }
${h} table.dataview.table-view-table th, ${h} table.dataview.table-view-table td { border: 1px solid var(--background-modifier-border); padding: 10px 12px; font-size: 13px; }
${h} table.dataview.table-view-table th { background: var(--background-secondary); font-weight: 600; font-size: 14px; }
${h} table.dataview.table-view-table tbody tr:nth-child(even) td { background: var(--background-primary-alt); }
${h} ul { list-style: none; padding-left: 0; border: 1px solid var(--background-modifier-border); border-radius: 6px; overflow: hidden; }
${h} ul li { padding: 8px 12px; border: none; border-bottom: 1px solid var(--background-modifier-border); transition: background 0.2s ease; }
${h} ul li:last-child { border-bottom: none; }
${h} ul li:hover { background: var(--background-secondary); }`;

    default: return '';
  }
}
