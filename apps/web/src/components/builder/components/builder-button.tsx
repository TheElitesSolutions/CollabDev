'use client';

import { ComponentConfig } from '@measured/puck';
import { Button } from '@/components/ui/button';

export interface BuilderButtonProps {
  text: string;
  link: string;
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size: 'default' | 'sm' | 'lg' | 'icon';
  fullWidth: boolean;
  alignment: 'left' | 'center' | 'right';
}

export function BuilderButton({
  text,
  link,
  variant,
  size,
  fullWidth,
  alignment,
}: BuilderButtonProps) {
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <div className={`flex ${alignmentClasses[alignment]}`}>
      <Button
        variant={variant}
        size={size}
        className={fullWidth ? 'w-full' : ''}
        asChild
      >
        <a href={link || '#'}>{text}</a>
      </Button>
    </div>
  );
}

export const builderButtonConfig: ComponentConfig<BuilderButtonProps> = {
  label: 'Button',
  fields: {
    text: {
      type: 'text',
      label: 'Button Text',
    },
    link: {
      type: 'text',
      label: 'Link URL',
    },
    variant: {
      type: 'select',
      label: 'Style',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Destructive', value: 'destructive' },
        { label: 'Outline', value: 'outline' },
        { label: 'Secondary', value: 'secondary' },
        { label: 'Ghost', value: 'ghost' },
        { label: 'Link', value: 'link' },
      ],
    },
    size: {
      type: 'select',
      label: 'Size',
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Default', value: 'default' },
        { label: 'Large', value: 'lg' },
      ],
    },
    fullWidth: {
      type: 'radio',
      label: 'Full Width',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
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
  },
  defaultProps: {
    text: 'Click Me',
    link: '#',
    variant: 'default',
    size: 'default',
    fullWidth: false,
    alignment: 'left',
  },
  render: BuilderButton,
};
