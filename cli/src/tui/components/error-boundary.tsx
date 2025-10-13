import React, { Component, ReactNode } from 'react';
import { Box, Text } from 'ink';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component for catching and displaying render errors.
 * Wraps the main app to provide a fallback UI on unexpected errors.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details for debugging
    console.error('ErrorBoundary caught error:', error);
    console.error('Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box flexDirection="column" paddingX={2} paddingY={1}>
          <Box>
            <Text color="red" bold>
              ✗ Unexpected Error
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text>{this.state.error?.message || 'Unknown error occurred'}</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              This is likely a bug. Please report it with the error message above.
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Press 'q' to quit</Text>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
