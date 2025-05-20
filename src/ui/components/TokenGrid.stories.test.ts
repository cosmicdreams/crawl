// src/ui/components/TokenGrid.stories.test.ts
import { test, expect } from '@storybook/test';
import { within, userEvent } from '@storybook/test';

test('TokenGrid renders all tokens by default', async ({ canvasElement }) => {
  // Get the canvas element
  const canvas = within(canvasElement);
  
  // Check if the title is displayed
  expect(canvas.getByText('Design Tokens')).toBeInTheDocument();
  
  // Check if tokens are displayed
  expect(canvas.getByText('primary')).toBeInTheDocument();
  expect(canvas.getByText('secondary')).toBeInTheDocument();
  expect(canvas.getByText('heading-1')).toBeInTheDocument();
});

test('TokenGrid filters tokens by type', async ({ canvasElement }) => {
  // Get the canvas element
  const canvas = within(canvasElement);
  
  // Click on the color type filter
  await userEvent.click(canvas.getByText('color'));
  
  // Check if only color tokens are displayed
  expect(canvas.getByText('primary')).toBeInTheDocument();
  expect(canvas.getByText('secondary')).toBeInTheDocument();
  expect(canvas.queryByText('heading-1')).not.toBeInTheDocument();
});

test('TokenGrid filters tokens by category', async ({ canvasElement }) => {
  // Get the canvas element
  const canvas = within(canvasElement);
  
  // Click on the brand category filter
  await userEvent.click(canvas.getByText('brand'));
  
  // Check if only brand tokens are displayed
  expect(canvas.getByText('primary')).toBeInTheDocument();
  expect(canvas.getByText('secondary')).toBeInTheDocument();
  expect(canvas.queryByText('heading-1')).not.toBeInTheDocument();
});

test('TokenGrid filters tokens by search', async ({ canvasElement }) => {
  // Get the canvas element
  const canvas = within(canvasElement);
  
  // Type in the search box
  await userEvent.type(canvas.getByPlaceholderText('Search tokens...'), 'primary');
  
  // Check if only matching tokens are displayed
  expect(canvas.getByText('primary')).toBeInTheDocument();
  expect(canvas.queryByText('secondary')).not.toBeInTheDocument();
  expect(canvas.queryByText('heading-1')).not.toBeInTheDocument();
});

test('TokenGrid clears filters', async ({ canvasElement }) => {
  // Get the canvas element
  const canvas = within(canvasElement);
  
  // Apply a filter
  await userEvent.click(canvas.getByText('color'));
  
  // Check if filter is applied
  expect(canvas.queryByText('heading-1')).not.toBeInTheDocument();
  
  // Clear filters
  await userEvent.click(canvas.getByText('Clear Filters'));
  
  // Check if all tokens are displayed again
  expect(canvas.getByText('primary')).toBeInTheDocument();
  expect(canvas.getByText('secondary')).toBeInTheDocument();
  expect(canvas.getByText('heading-1')).toBeInTheDocument();
});
