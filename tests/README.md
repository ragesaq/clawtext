# Clawtext Test Suite

Comprehensive testing for all Clawtext functionality.

## Running Tests

```bash
# Install test dependencies
npm install

# Run all tests
npm test

# Run specific test file
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## Test Structure

```
tests/
├── unit/              # Unit tests for individual functions
├── integration/       # Integration tests for module interactions
├── e2e/              # End-to-end tests for full workflows
├── fixtures/         # Test data and mock memory files
└── helpers/          # Test utilities
```

## Test Categories

### Unit Tests
- Query expansion algorithms
- Keyword scoring
- RRF (Reciprocal Rank Fusion)
- MMR (Maximal Marginal Relevance)
- Confidence filtering

### Integration Tests
- Hybrid search with real memory files
- Cluster creation and loading
- Session context injection
- Extension registration

### E2E Tests
- Full workflow: search → rank → inject
- Performance benchmarks
- Error recovery
- Configuration loading