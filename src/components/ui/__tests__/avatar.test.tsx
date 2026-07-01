import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Avatar } from '../avatar';

describe('Avatar', () => {
  it('renders initials when no src', () => {
    render(<Avatar fallback="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders image when src provided', () => {
    render(<Avatar src="/avatar.jpg" alt="User avatar" />);
    expect(screen.getByRole('img', { name: /user avatar/i })).toHaveAttribute('src', '/avatar.jpg');
  });

  it('applies size styles', () => {
    const { container } = render(<Avatar fallback="JD" size="lg" />);
    expect(container.firstChild).toHaveClass('h-12');
  });
});
