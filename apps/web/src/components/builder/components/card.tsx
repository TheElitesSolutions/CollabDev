'use client';

import { ComponentConfig } from '@measured/puck';
import { Card as ShadcnCard, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface CardProps {
  title: string;
  description: string;
  content: string;
  imageUrl: string;
  buttonText: string;
  buttonLink: string;
  showButton: boolean;
}

export function Card({
  title,
  description,
  content,
  imageUrl,
  buttonText,
  buttonLink,
  showButton,
}: CardProps) {
  return (
    <ShadcnCard className="overflow-hidden">
      {imageUrl && (
        <div className="aspect-video relative overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {content && (
        <CardContent>
          <p className="text-muted-foreground">{content}</p>
        </CardContent>
      )}
      {showButton && buttonText && (
        <CardFooter>
          <Button asChild>
            <a href={buttonLink || '#'}>{buttonText}</a>
          </Button>
        </CardFooter>
      )}
    </ShadcnCard>
  );
}

export const cardConfig: ComponentConfig<CardProps> = {
  label: 'Card',
  fields: {
    title: {
      type: 'text',
      label: 'Title',
    },
    description: {
      type: 'text',
      label: 'Description',
    },
    content: {
      type: 'textarea',
      label: 'Content',
    },
    imageUrl: {
      type: 'text',
      label: 'Image URL',
    },
    buttonText: {
      type: 'text',
      label: 'Button Text',
    },
    buttonLink: {
      type: 'text',
      label: 'Button Link',
    },
    showButton: {
      type: 'radio',
      label: 'Show Button',
      options: [
        { label: 'Yes', value: true },
        { label: 'No', value: false },
      ],
    },
  },
  defaultProps: {
    title: 'Card Title',
    description: 'Card description goes here',
    content: 'This is the card content. Add your text here.',
    imageUrl: '',
    buttonText: 'Learn More',
    buttonLink: '#',
    showButton: true,
  },
  render: Card,
};
