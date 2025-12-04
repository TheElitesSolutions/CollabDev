'use client';

import { Config } from '@measured/puck';
import {
  heroConfig,
  sectionConfig,
  textConfig,
  builderButtonConfig,
  builderImageConfig,
  cardConfig,
  gridConfig,
  spacerConfig,
} from './components';

interface RootProps {
  children: React.ReactNode;
  title?: string;
}

function RootComponent({ children, title }: RootProps) {
  return (
    <div className="min-h-screen" data-page-title={title}>
      {children}
    </div>
  );
}

export const puckConfig: Config = {
  components: {
    Hero: heroConfig,
    Section: sectionConfig,
    Text: textConfig,
    Button: builderButtonConfig,
    Image: builderImageConfig,
    Card: cardConfig,
    Grid: gridConfig,
    Spacer: spacerConfig,
  },
  categories: {
    layout: {
      title: 'Layout',
      components: ['Section', 'Grid', 'Spacer'],
    },
    content: {
      title: 'Content',
      components: ['Hero', 'Text', 'Image', 'Card'],
    },
    interactive: {
      title: 'Interactive',
      components: ['Button'],
    },
  },
  root: {
    fields: {
      title: {
        type: 'text',
        label: 'Page Title',
      },
    },
    defaultProps: {
      title: 'My Page',
    },
    render: RootComponent,
  },
};

export type PuckConfig = typeof puckConfig;
