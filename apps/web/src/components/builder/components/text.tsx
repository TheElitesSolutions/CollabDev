'use client';

import { ComponentConfig } from '@measured/puck';

export interface TextProps {
  content: string;
  variant: 'body' | 'heading1' | 'heading2' | 'heading3' | 'heading4' | 'lead' | 'small' | 'muted';
  alignment: 'left' | 'center' | 'right' | 'justify';
  color: string;
}

export function Text({ content, variant, alignment, color }: TextProps) {
  const variantClasses = {
    body: 'text-base',
    heading1: 'text-4xl md:text-5xl font-bold tracking-tight',
    heading2: 'text-3xl md:text-4xl font-semibold tracking-tight',
    heading3: 'text-2xl md:text-3xl font-semibold',
    heading4: 'text-xl md:text-2xl font-medium',
    lead: 'text-xl text-muted-foreground',
    small: 'text-sm',
    muted: 'text-sm text-muted-foreground',
  };

  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  };

  const Tag = variant.startsWith('heading') ? (variant.replace('heading', 'h') as keyof JSX.IntrinsicElements) : 'p';

  return (
    <Tag
      className={`${variantClasses[variant]} ${alignmentClasses[alignment]}`}
      style={{ color: color || 'inherit' }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

export const textConfig: ComponentConfig<TextProps> = {
  label: 'Text',
  fields: {
    content: {
      type: 'textarea',
      label: 'Content',
    },
    variant: {
      type: 'select',
      label: 'Style',
      options: [
        { label: 'Body', value: 'body' },
        { label: 'Heading 1', value: 'heading1' },
        { label: 'Heading 2', value: 'heading2' },
        { label: 'Heading 3', value: 'heading3' },
        { label: 'Heading 4', value: 'heading4' },
        { label: 'Lead', value: 'lead' },
        { label: 'Small', value: 'small' },
        { label: 'Muted', value: 'muted' },
      ],
    },
    alignment: {
      type: 'radio',
      label: 'Alignment',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
        { label: 'Justify', value: 'justify' },
      ],
    },
    color: {
      type: 'text',
      label: 'Text Color',
    },
  },
  defaultProps: {
    content: 'Enter your text here...',
    variant: 'body',
    alignment: 'left',
    color: '',
  },
  render: Text,
};
