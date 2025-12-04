'use client';

import { ComponentConfig } from '@measured/puck';
import { DropZone } from '@measured/puck';

export interface GridProps {
  columns: 1 | 2 | 3 | 4 | 6;
  gap: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  alignItems: 'start' | 'center' | 'end' | 'stretch';
}

export function Grid({ columns, gap, alignItems }: GridProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  };

  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]} ${alignClasses[alignItems]}`}>
      {Array.from({ length: columns }).map((_, index) => (
        <div key={index} className="min-h-[100px]">
          <DropZone zone={`column-${index}`} />
        </div>
      ))}
    </div>
  );
}

export const gridConfig: ComponentConfig<GridProps> = {
  label: 'Grid',
  fields: {
    columns: {
      type: 'select',
      label: 'Columns',
      options: [
        { label: '1 Column', value: 1 },
        { label: '2 Columns', value: 2 },
        { label: '3 Columns', value: 3 },
        { label: '4 Columns', value: 4 },
        { label: '6 Columns', value: 6 },
      ],
    },
    gap: {
      type: 'select',
      label: 'Gap',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
        { label: 'XL', value: 'xl' },
      ],
    },
    alignItems: {
      type: 'select',
      label: 'Align Items',
      options: [
        { label: 'Start', value: 'start' },
        { label: 'Center', value: 'center' },
        { label: 'End', value: 'end' },
        { label: 'Stretch', value: 'stretch' },
      ],
    },
  },
  defaultProps: {
    columns: 3,
    gap: 'md',
    alignItems: 'stretch',
  },
  render: Grid,
};
