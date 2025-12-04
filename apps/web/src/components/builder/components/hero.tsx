'use client';

import { ComponentConfig } from '@measured/puck';
import { Button } from '@/components/ui/button';

export interface HeroProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  alignment: 'left' | 'center' | 'right';
  backgroundType: 'gradient' | 'solid' | 'image';
  backgroundColor: string;
  backgroundImage: string;
  minHeight: string;
}

export function Hero({
  title,
  subtitle,
  ctaText,
  ctaLink,
  alignment,
  backgroundType,
  backgroundColor,
  backgroundImage,
  minHeight,
}: HeroProps) {
  const alignmentClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  };

  const backgroundStyles: React.CSSProperties = {
    minHeight: minHeight || '60vh',
  };

  if (backgroundType === 'gradient') {
    backgroundStyles.background = 'linear-gradient(135deg, hsl(var(--primary)/0.1), hsl(var(--secondary)/0.1))';
  } else if (backgroundType === 'solid') {
    backgroundStyles.backgroundColor = backgroundColor || 'hsl(var(--muted))';
  } else if (backgroundType === 'image' && backgroundImage) {
    backgroundStyles.backgroundImage = `url(${backgroundImage})`;
    backgroundStyles.backgroundSize = 'cover';
    backgroundStyles.backgroundPosition = 'center';
  }

  return (
    <section
      className={`relative flex flex-col justify-center ${alignmentClasses[alignment]} px-4 py-16`}
      style={backgroundStyles}
    >
      {backgroundType === 'image' && backgroundImage && (
        <div className="absolute inset-0 bg-black/40" />
      )}
      <div className={`relative z-10 max-w-3xl mx-auto w-full flex flex-col ${alignmentClasses[alignment]}`}>
        <h1 className="text-4xl md:text-6xl font-bold mb-4 text-foreground">
          {title}
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
          {subtitle}
        </p>
        {ctaText && (
          <Button size="lg" asChild>
            <a href={ctaLink || '#'}>{ctaText}</a>
          </Button>
        )}
      </div>
    </section>
  );
}

export const heroConfig: ComponentConfig<HeroProps> = {
  label: 'Hero',
  fields: {
    title: {
      type: 'text',
      label: 'Title',
    },
    subtitle: {
      type: 'textarea',
      label: 'Subtitle',
    },
    ctaText: {
      type: 'text',
      label: 'Button Text',
    },
    ctaLink: {
      type: 'text',
      label: 'Button Link',
    },
    alignment: {
      type: 'radio',
      label: 'Alignment',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
    backgroundType: {
      type: 'radio',
      label: 'Background Type',
      options: [
        { label: 'Gradient', value: 'gradient' },
        { label: 'Solid', value: 'solid' },
        { label: 'Image', value: 'image' },
      ],
    },
    backgroundColor: {
      type: 'text',
      label: 'Background Color',
    },
    backgroundImage: {
      type: 'text',
      label: 'Background Image URL',
    },
    minHeight: {
      type: 'text',
      label: 'Minimum Height',
    },
  },
  defaultProps: {
    title: 'Welcome to Our Site',
    subtitle: 'Build something amazing with our drag-and-drop builder',
    ctaText: 'Get Started',
    ctaLink: '#',
    alignment: 'center',
    backgroundType: 'gradient',
    backgroundColor: '',
    backgroundImage: '',
    minHeight: '60vh',
  },
  render: Hero,
};
