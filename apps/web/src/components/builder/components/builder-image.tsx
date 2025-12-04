'use client';

import { ComponentConfig } from '@measured/puck';
import Image from 'next/image';

export interface BuilderImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  objectFit: 'contain' | 'cover' | 'fill' | 'none';
  rounded: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  alignment: 'left' | 'center' | 'right';
}

export function BuilderImage({
  src,
  alt,
  width,
  height,
  objectFit,
  rounded,
  shadow,
  alignment,
}: BuilderImageProps) {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  };

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl',
  };

  const alignmentClasses = {
    left: 'mr-auto',
    center: 'mx-auto',
    right: 'ml-auto',
  };

  // Show placeholder if no image
  if (!src) {
    return (
      <div
        className={`bg-muted flex items-center justify-center ${roundedClasses[rounded]} ${shadowClasses[shadow]} ${alignmentClasses[alignment]}`}
        style={{ width: width || 400, height: height || 300 }}
      >
        <span className="text-muted-foreground text-sm">Add image URL</span>
      </div>
    );
  }

  return (
    <div className={`relative ${alignmentClasses[alignment]}`} style={{ width: width || 'auto' }}>
      <Image
        src={src}
        alt={alt || 'Image'}
        width={width || 400}
        height={height || 300}
        className={`${roundedClasses[rounded]} ${shadowClasses[shadow]}`}
        style={{ objectFit }}
        unoptimized
      />
    </div>
  );
}

export const builderImageConfig: ComponentConfig<BuilderImageProps> = {
  label: 'Image',
  fields: {
    src: {
      type: 'text',
      label: 'Image URL',
    },
    alt: {
      type: 'text',
      label: 'Alt Text',
    },
    width: {
      type: 'number',
      label: 'Width',
    },
    height: {
      type: 'number',
      label: 'Height',
    },
    objectFit: {
      type: 'select',
      label: 'Object Fit',
      options: [
        { label: 'Contain', value: 'contain' },
        { label: 'Cover', value: 'cover' },
        { label: 'Fill', value: 'fill' },
        { label: 'None', value: 'none' },
      ],
    },
    rounded: {
      type: 'select',
      label: 'Rounded Corners',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
        { label: 'XL', value: 'xl' },
        { label: '2XL', value: '2xl' },
        { label: 'Full', value: 'full' },
      ],
    },
    shadow: {
      type: 'select',
      label: 'Shadow',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
        { label: 'XL', value: 'xl' },
        { label: '2XL', value: '2xl' },
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
    src: '',
    alt: '',
    width: 400,
    height: 300,
    objectFit: 'cover',
    rounded: 'md',
    shadow: 'none',
    alignment: 'center',
  },
  render: BuilderImage,
};
