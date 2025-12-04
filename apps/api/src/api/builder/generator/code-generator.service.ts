import { Injectable, Logger } from '@nestjs/common';

// Puck data types
interface PuckComponent {
  type: string;
  props: Record<string, unknown>;
}

interface PuckData {
  content: PuckComponent[];
  root: Record<string, unknown>;
}

// Component mapping for imports
const COMPONENT_MAP: Record<string, string> = {
  Hero: 'Hero',
  Section: 'Section',
  Text: 'Text',
  Button: 'BuilderButton',
  Image: 'BuilderImage',
  Card: 'Card',
  Grid: 'Grid',
  Spacer: 'Spacer',
};

@Injectable()
export class CodeGeneratorService {
  private readonly logger = new Logger(CodeGeneratorService.name);

  /**
   * Generate React/Next.js code from Puck page data
   * This generates code that reuses the actual builder components
   */
  generateReactCode(pageName: string, data: PuckData): string {
    const pageTitle = (data.root?.title as string) || pageName;
    const usedComponents = new Set<string>();
    const componentJsx: string[] = [];

    // Process each component
    for (const component of data.content || []) {
      const mappedName = COMPONENT_MAP[component.type];
      if (mappedName) {
        usedComponents.add(mappedName);
        componentJsx.push(this.componentToJsx(component));
      } else {
        this.logger.warn(`Unknown component type: ${component.type}`);
        componentJsx.push(`      {/* Unknown component: ${component.type} */}`);
      }
    }

    // Build imports
    const componentImports =
      usedComponents.size > 0
        ? `import { ${Array.from(usedComponents).join(', ')} } from '@/components/builder/components';`
        : '';

    const contentSection =
      componentJsx.length > 0
        ? componentJsx.join('\n')
        : '      {/* Add components in the builder to generate content */}';

    // Generate the final page component
    const code = `'use client';

import React from 'react';
${componentImports}

/**
 * ${pageTitle}
 * Generated from Website Builder
 */
export default function ${this.toPascalCase(pageName)}Page() {
  return (
    <main className="min-h-screen">
${contentSection}
    </main>
  );
}
`;

    return code;
  }

  /**
   * Generate HTML code from Puck page data
   */
  generateHtmlCode(pageName: string, data: PuckData): string {
    const pageTitle = (data.root?.title as string) || pageName;
    const htmlContent = (data.content || [])
      .map((component) => this.componentToHtml(component))
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen">
${htmlContent || '  <!-- Add components in the builder to generate content -->'}
</body>
</html>
`;
  }

  /**
   * Convert a Puck component to JSX using the actual component
   */
  private componentToJsx(component: PuckComponent): string {
    const componentName = COMPONENT_MAP[component.type];
    if (!componentName) {
      return `      {/* Unknown component: ${component.type} */}`;
    }

    const propsString = this.propsToJsx(component.props);
    return `      <${componentName}${propsString ? ' ' + propsString : ''} />`;
  }

  /**
   * Convert props object to JSX attribute string
   */
  private propsToJsx(props: Record<string, unknown>): string {
    if (!props || Object.keys(props).length === 0) {
      return '';
    }

    return Object.entries(props)
      .filter(
        ([, value]) =>
          value !== undefined && value !== null && value !== '',
      )
      .map(([key, value]) => {
        if (typeof value === 'string') {
          // Escape special characters in string values
          const escaped = value.replace(/"/g, '\\"').replace(/\n/g, '\\n');
          return `${key}="${escaped}"`;
        } else if (typeof value === 'boolean') {
          return value ? key : `${key}={false}`;
        } else if (typeof value === 'number') {
          return `${key}={${value}}`;
        } else if (Array.isArray(value) || typeof value === 'object') {
          return `${key}={${JSON.stringify(value)}}`;
        }
        return `${key}={${JSON.stringify(value)}}`;
      })
      .join(' ');
  }

  /**
   * Convert a Puck component to HTML
   */
  private componentToHtml(component: PuckComponent): string {
    switch (component.type) {
      case 'Hero':
        return this.heroToHtml(component.props);
      case 'Section':
        return this.sectionToHtml(component.props);
      case 'Text':
        return this.textToHtml(component.props);
      case 'Button':
        return this.buttonToHtml(component.props);
      case 'Image':
        return this.imageToHtml(component.props);
      case 'Card':
        return this.cardToHtml(component.props);
      case 'Grid':
        return this.gridToHtml(component.props);
      case 'Spacer':
        return this.spacerToHtml(component.props);
      default:
        return `  <!-- Unknown component: ${component.type} -->`;
    }
  }

  // === HTML Component Generators ===

  private heroToHtml(props: Record<string, unknown>): string {
    const title = (props.title as string) || 'Welcome';
    const subtitle = (props.subtitle as string) || '';
    const ctaText = (props.ctaText as string) || 'Get Started';
    const ctaLink = (props.ctaLink as string) || '#';
    const alignment = (props.alignment as string) || 'center';

    const alignClass =
      alignment === 'left'
        ? 'text-left'
        : alignment === 'right'
          ? 'text-right'
          : 'text-center';

    return `  <section class="min-h-[60vh] flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
    <div class="${alignClass} max-w-3xl mx-auto px-4">
      <h1 class="text-4xl md:text-6xl font-bold mb-4">${title}</h1>
      ${subtitle ? `<p class="text-xl text-gray-600 mb-8">${subtitle}</p>` : ''}
      ${ctaText ? `<a href="${ctaLink}" class="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white h-10 px-8 py-2 hover:bg-blue-700">${ctaText}</a>` : ''}
    </div>
  </section>`;
  }

  private sectionToHtml(props: Record<string, unknown>): string {
    const padding = (props.padding as string) || 'md';
    const backgroundColor = (props.backgroundColor as string) || '';
    const paddingClasses: Record<string, string> = {
      none: 'py-0',
      sm: 'py-8',
      md: 'py-16',
      lg: 'py-24',
    };

    const bgStyle = backgroundColor ? ` style="background-color: ${backgroundColor}"` : '';

    return `  <section class="${paddingClasses[padding] || 'py-16'}"${bgStyle}>
    <div class="max-w-screen-xl mx-auto px-4">
      <!-- Section content -->
    </div>
  </section>`;
  }

  private textToHtml(props: Record<string, unknown>): string {
    const content = (props.content as string) || '';
    const variant = (props.variant as string) || 'body';
    const alignment = (props.alignment as string) || 'left';

    const variantElements: Record<string, { tag: string; className: string }> = {
      h1: { tag: 'h1', className: 'text-4xl font-bold' },
      h2: { tag: 'h2', className: 'text-3xl font-semibold' },
      h3: { tag: 'h3', className: 'text-2xl font-semibold' },
      h4: { tag: 'h4', className: 'text-xl font-semibold' },
      body: { tag: 'p', className: 'text-base' },
      lead: { tag: 'p', className: 'text-xl text-gray-600' },
      muted: { tag: 'p', className: 'text-sm text-gray-500' },
    };

    const { tag, className } = variantElements[variant] || variantElements.body;
    return `  <${tag} class="${className} text-${alignment}">${content}</${tag}>`;
  }

  private buttonToHtml(props: Record<string, unknown>): string {
    const label = (props.label as string) || 'Click me';
    const href = (props.href as string) || '#';
    const variant = (props.variant as string) || 'default';

    const variantClasses: Record<string, string> = {
      default: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
      outline: 'border border-gray-300 bg-transparent hover:bg-gray-100',
      ghost: 'bg-transparent hover:bg-gray-100',
    };

    return `  <a href="${href}" class="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 ${variantClasses[variant] || variantClasses.default}">${label}</a>`;
  }

  private imageToHtml(props: Record<string, unknown>): string {
    const src = (props.src as string) || '/placeholder.jpg';
    const alt = (props.alt as string) || 'Image';
    const rounded = (props.rounded as boolean) || false;

    return `  <img src="${src}" alt="${alt}" class="object-cover${rounded ? ' rounded-lg' : ''}" loading="lazy" />`;
  }

  private cardToHtml(props: Record<string, unknown>): string {
    const title = (props.title as string) || 'Card Title';
    const description = (props.description as string) || '';
    const imageSrc = (props.imageSrc as string) || '';

    return `  <div class="rounded-lg border bg-white shadow-sm overflow-hidden">
    ${imageSrc ? `<img src="${imageSrc}" alt="${title}" class="w-full h-48 object-cover" loading="lazy" />` : ''}
    <div class="p-6">
      <h3 class="text-lg font-semibold">${title}</h3>
      ${description ? `<p class="text-sm text-gray-600 mt-2">${description}</p>` : ''}
    </div>
  </div>`;
  }

  private gridToHtml(props: Record<string, unknown>): string {
    const columns = (props.columns as number) || 3;
    const gap = (props.gap as string) || 'md';

    const gapClasses: Record<string, string> = {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-8',
    };

    return `  <div class="grid grid-cols-1 md:grid-cols-${columns} ${gapClasses[gap] || 'gap-4'}">
    <!-- Grid items -->
  </div>`;
  }

  private spacerToHtml(props: Record<string, unknown>): string {
    const height = (props.height as string) || 'md';
    const showLine = (props.showLine as boolean) || false;

    const heightClasses: Record<string, string> = {
      sm: 'h-4',
      md: 'h-8',
      lg: 'h-16',
      xl: 'h-24',
    };

    if (showLine) {
      return `  <div class="${heightClasses[height] || 'h-8'} flex items-center">
    <hr class="w-full border-t border-gray-200" />
  </div>`;
    }

    return `  <div class="${heightClasses[height] || 'h-8'}"></div>`;
  }

  // === Utilities ===

  private toPascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/[\s_-]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}
