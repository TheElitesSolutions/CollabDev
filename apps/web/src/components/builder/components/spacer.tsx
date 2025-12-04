'use client';

import { ComponentConfig } from '@measured/puck';

export interface SpacerProps {
  height: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  showLine: boolean;
  lineColor: string;
}

export function Spacer({ height, showLine, lineColor }: SpacerProps) {
  const heightClasses = {
    xs: 'h-4',
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-24',
    '2xl': 'h-32',
    '3xl': 'h-48',
  };

  return (
    <div className={`${heightClasses[height]} w-full flex items-center`}>
      {showLine && (
        <div
          className="w-full h-px"
          style={{ backgroundColor: lineColor || 'hsl(var(--border))' }}
        />
      )}
    </div>
  );
}

export const spacerConfig: ComponentConfig<SpacerProps> = {
  label: 'Spacer',
  fields: {
    height: {
      type: 'select',
      label: 'Height',
      options: [
        { label: 'Extra Small', value: 'xs' },
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
        { label: 'XL', value: 'xl' },
        { label: '2XL', value: '2xl' },
        { label: '3XL', value: '3xl' },
      ],
    },
    showLine: {
      type: 'radio',
      label: 'Show Divider Line',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
    lineColor: {
      type: 'text',
      label: 'Line Color',
    },
  },
  defaultProps: {
    height: 'md',
    showLine: false,
    lineColor: '',
  },
  render: Spacer,
};
