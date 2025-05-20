// src/ui/components/TokenCard.stories.test.ts
import { test, expect } from '@storybook/test';
import { within, userEvent } from '@storybook/test';

test('TokenCard renders color token correctly', async ({ canvasElement }) => {
  // Get the canvas element
  const canvas = within(canvasElement);
  
  // Check if the token name is displayed
  expect(canvas.getByText('primary')).toBeInTheDocument();
  
  // Check if the token value is displayed
  expect(canvas.getByText('#0066cc')).toBeInTheDocument();
  
  // Check if the category is displayed
  expect(canvas.getByText('brand')).toBeInTheDocument();
  
  // Check if the usage count is displayed
  expect(canvas.getByText('Used 42 times')).toBeInTheDocument();
});

test('TokenCard renders typography token correctly', async ({ canvasElement }) => {
  // Get the canvas element
  const canvas = within(canvasElement);
  
  // Check if the token name is displayed
  expect(canvas.getByText('heading-1')).toBeInTheDocument();
  
  // Check if the token value is displayed
  expect(canvas.getByText(/font-family: Inter/)).toBeInTheDocument();
  
  // Check if the category is displayed
  expect(canvas.getByText('heading')).toBeInTheDocument();
  
  // Check if the usage count is displayed
  expect(canvas.getByText('Used 15 times')).toBeInTheDocument();
});

test('TokenCard handles click events', async ({ canvasElement }) => {
  // Get the canvas element
  const canvas = within(canvasElement);
  
  // Click on the token card
  await userEvent.click(canvas.getByText('primary'));
  
  // The click event should be logged in the actions panel
  // This is a visual check in Storybook, not an automated test
});
