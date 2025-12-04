'use client';

import { ComponentConfig } from '@measured/puck';
import { DropZone } from '@measured/puck';

export interface SectionProps {
  backgroundColor: string;
  paddingTop: string;
  paddingBottom: string;
  paddingX: string;
  maxWidth: 'full' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl';
}

export function Section({
  backgroundColor,
  paddingTop,
  paddingBottom,
  paddingX,
  maxWidth,
}: SectionProps) {
  const maxWidthClasses = {
    full: 'max-w-full',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
  };

  return (
    <section
      className="w-full"
      style={{
        backgroundColor: backgroundColor || 'transparent',
        paddingTop: paddingTop || '4rem',
        paddingBottom: paddingBottom || '4rem',
        paddingLeft: paddingX || '1rem',
        paddingRight: paddingX || '1rem',
      }}
    >
      <div className={`${maxWidthClasses[maxWidth]} mx-auto`}>
        <DropZone zone="content" />
      </div>
    </section>
  );
}

export const sectionConfig: ComponentConfig<SectionProps> = {
  label: 'Section',
  fields: {
    backgroundColor: {
      type: 'text',
      label: 'Background Color',
    },
    paddingTop: {
      type: 'text',
      label: 'Padding Top',
    },
    paddingBottom: {
      type: 'text',
      label: 'Padding Bottom',
    },
    paddingX: {
      type: 'text',
      label: 'Horizontal Padding',
    },
    maxWidth: {
      type: 'select',
      label: 'Max Width',
      options: [
        { label: 'Full', value: 'full' },
        { label: 'XL (1280px)', value: 'xl' },
        { label: '2XL (1536px)', value: '2xl' },
        { label: '4XL', value: '4xl' },
        { label: '6XL', value: '6xl' },
        { label: '7XL', value: '7xl' },
      ],
    },
  },
  defaultProps: {
    backgroundColor: '',
    paddingTop: '4rem',
    paddingBottom: '4rem',
    paddingX: '1rem',
    maxWidth: '6xl',
  },
  render: Section,
};
