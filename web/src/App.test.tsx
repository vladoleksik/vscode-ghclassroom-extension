import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('Renders panel', () => {
  render(<App />);
  const titleElement = screen.getByText(/Assignment/i);
  expect(titleElement).toBeInTheDocument();
});
