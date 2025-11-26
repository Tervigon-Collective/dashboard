<!-- c3737f0c-a355-4ea7-bfff-55f8a4bd1ded 302ae9a6-da28-44fa-9173-086369a0d991 -->
# Frontend Integration Plan for AI Insights

## Overview

Integrate the AI insights endpoint (`POST /api/v1/insights/explain`) into the frontend to provide AI-powered explanations for any data displayed in analytics dashboards. This plan provides framework-agnostic patterns that can be adapted to React, Vue, Angular, or any frontend framework.

## Key Principles

1. **Reusable**: Works with any data type/endpoint
2. **Non-Intrusive**: Easy to add to existing components
3. **User-Friendly**: Loading states, error handling, graceful degradation
4. **Flexible**: Can be used as modal, drawer, tooltip, or inline component

## Architecture

### Integration Pattern

```
Existing Component (e.g., HourlyEfficiencyHeatmap)
    ↓
    [AI Insight Button]
    ↓
    Call Insights API with current data
    ↓
    Display Insights Modal/Drawer
    ↓
    Show formatted insights (explanation, key points, recommendations)
```

## Implementation Steps

### 1. API Service Layer

**File**: `src/api/insightsApi.js` (or `src/services/insightsService.ts`)

Create a generic API service function:

```javascript
// Framework-agnostic API service
export async function explainData(data, context = {}) {
  const response = await fetch('/api/v1/insights/explain', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Add auth headers if needed
    },
    body: JSON.stringify({
      data,
      context,
    }),
  });

  if (!response.ok) {
    throw new Error(`Insights API error: ${response.statusText}`);
  }

  return await response.json();
}
```

**Features**:

- Error handling with retry logic
- Timeout management (30s default)
- Request cancellation support
- Loading state management

### 2. Generic Insights Hook/Composable

**For React**: `src/hooks/useInsights.js` or `useInsights.ts`

```javascript
import { useState, useCallback } from 'react';
import { explainData } from '../api/insightsApi';

export function useInsights() {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);

  const generateInsights = useCallback(async (data, context) => {
    setLoading(true);
    setError(null);
    try {
      const result = await explainData(data, context);
      setInsights(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearInsights = useCallback(() => {
    setInsights(null);
    setError(null);
  }, []);

  return {
    loading,
    insights,
    error,
    generateInsights,
    clearInsights,
  };
}
```

**For Vue**: `src/composables/useInsights.js`

```javascript
import { ref } from 'vue';
import { explainData } from '../api/insightsApi';

export function useInsights() {
  const loading = ref(false);
  const insights = ref(null);
  const error = ref(null);

  const generateInsights = async (data, context) => {
    loading.value = true;
    error.value = null;
    try {
      const result = await explainData(data, context);
      insights.value = result;
      return result;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearInsights = () => {
    insights.value = null;
    error.value = null;
  };

  return {
    loading,
    insights,
    error,
    generateInsights,
    clearInsights,
  };
}
```

### 3. Insights Modal Component

**File**: `src/components/InsightsModal.jsx` (or `.vue`, `.tsx`)

Generic modal component that displays insights:

**Features**:

- Displays explanation (main text)
- Shows key points as bullet list
- Displays recommendations (if available)
- Shows statistics (if available)
- Loading skeleton
- Error state
- Close button
- Markdown/rich text support

**Sections**:

1. **Header**: Title, close button, metadata (analysis time, model)
2. **Explanation**: Main natural language explanation
3. **Key Points**: Bullet list of insights
4. **Recommendations**: Actionable items (if available)
5. **Statistics**: Basic stats (if available)

### 4. Add Insight Button to Existing Components

**Pattern**: Add button next to existing action buttons

**Example for HourlyEfficiencyHeatmap**:

```javascript
// In HourlyEfficiencyHeatmap component
import { useInsights } from '../hooks/useInsights';
import InsightsModal from '../components/InsightsModal';

function HourlyEfficiencyHeatmap({ data, startDate, endDate }) {
  const { loading, insights, error, generateInsights, clearInsights } = useInsights();
  const [showInsights, setShowInsights] = useState(false);

  const handleGetInsights = async () => {
    try {
      await generateInsights(data, {
        data_type: 'hourly_efficiency',
        domain: 'marketing',
        date_range: { start: startDate, end: endDate },
        question: 'What are the key insights and recommendations?',
      });
      setShowInsights(true);
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <>
      {/* Existing component code */}
      
      {/* Add AI Insight Button */}
      <button onClick={handleGetInsights} disabled={loading}>
        {loading ? <Spinner /> : <AIIcon />}
        AI Insights
      </button>

      {/* Insights Modal */}
      {showInsights && insights && (
        <InsightsModal
          insights={insights}
          onClose={() => {
            setShowInsights(false);
            clearInsights();
          }}
        />
      )}
    </>
  );
}
```

### 5. Context Builders (Helpers)

**File**: `src/utils/insightContexts.js`

Helper functions to build context for different data types:

```javascript
export function buildHourlyEfficiencyContext(data, startDate, endDate) {
  return {
    data_type: 'hourly_efficiency',
    domain: 'marketing',
    date_range: { start: startDate, end: endDate },
    metrics: ['roas', 'revenue', 'spend'],
    dimensions: ['hour', 'channel'],
  };
}

export function buildSalesSummaryContext(data, startDate, endDate) {
  return {
    data_type: 'sales_summary',
    domain: 'erp',
    date_range: { start: startDate, end: endDate },
    metrics: ['total_sales', 'average_order_value'],
  };
}

export function buildCustomerSegmentationContext(data) {
  return {
    data_type: 'customer_segmentation',
    domain: 'customer',
    dimensions: ['segment'],
  };
}
```

### 6. Error Handling & Edge Cases

**Error States**:

- LLM not configured: Show helpful message with setup instructions
- API timeout: Show timeout message, allow retry
- Network error: Show error, allow retry
- Invalid data: Show validation error

**Loading States**:

- Button loading state (spinner, disabled)
- Modal loading skeleton
- Progress indicator if needed

**Fallback Behavior**:

- If insights fail, still show basic statistics (from response)
- Graceful degradation if LLM disabled

### 7. UI/UX Enhancements

**Button Placement**:

- Next to existing action buttons (expand, filter, etc.)
- Consistent placement across all components
- Icon + text label

**Modal Design**:

- Responsive (mobile-friendly)
- Scrollable content for long explanations
- Collapsible sections for recommendations/stats
- Copy to clipboard for explanation text
- Print-friendly styling

**Animations**:

- Fade-in for modal
- Loading spinner animation
- Smooth transitions

### 8. Caching Strategy (Frontend)

**Client-Side Caching**:

- Cache insights by data hash/content
- Cache TTL: 5-10 minutes (from backend config)
- Invalidate on data refresh
```javascript
// Simple in-memory cache
const insightsCache = new Map();

function getCacheKey(data, context) {
  return JSON.stringify({ data, context });
}

async function getInsightsWithCache(data, context) {
  const key = getCacheKey(data, context);
  const cached = insightsCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.insights;
  }
  
  const insights = await explainData(data, context);
  insightsCache.set(key, {
    insights,
    timestamp: Date.now(),
  });
  
  return insights;
}
```


## File Structure

**New Frontend Files**:

```
src/
├── api/
│   └── insightsApi.js          # API service function
├── hooks/ (or composables/)
│   └── useInsights.js          # React hook / Vue composable
├── components/
│   └── InsightsModal.jsx       # Generic insights modal
├── utils/
│   └── insightContexts.js      # Context builder helpers
└── constants/
    └── insightDefaults.js      # Default configurations
```

## Integration Examples

### Example 1: Hourly Efficiency Heatmap

```javascript
// In HourlyEfficiencyHeatmap component
const handleInsights = async () => {
  const context = buildHourlyEfficiencyContext(
    hourlyData,
    startDate,
    endDate
  );
  await generateInsights(hourlyData, context);
};
```

### Example 2: Sales Summary Dashboard

```javascript
// In SalesSummary component
const handleInsights = async () => {
  const context = buildSalesSummaryContext(
    summaryData,
    startDate,
    endDate
  );
  await generateInsights(summaryData, context);
};
```

### Example 3: Customer Segmentation Chart

```javascript
// In CustomerSegmentation component
const handleInsights = async () => {
  const context = buildCustomerSegmentationContext(segments);
  await generateInsights({ segments }, context);
};
```

## Implementation Options

### Option A: Standalone Button + Modal (Recommended)

- Add "AI Insights" button to each component
- Opens modal with insights
- Simple, non-intrusive
- Works with any component

### Option B: Inline Insights Panel

- Add collapsible insights panel below data
- Always visible or toggleable
- Good for dashboards with space

### Option C: Floating Action Button (FAB)

- Floating button on dashboards
- Context-aware based on visible data
- Modern UX pattern

### Option D: Right-Side Drawer

- Slide-out drawer from right
- More space for detailed insights
- Good for desktop views

## Styling Considerations

- Match existing design system
- Use existing modal/drawer patterns
- Consistent iconography (AI/lightbulb icon)
- Loading states match app patterns
- Error states match app patterns

## Testing Strategy

- Unit tests for API service
- Unit tests for hooks/composables
- Component tests for modal
- Integration tests for full flow
- Mock API responses for testing
- Test error states

## Progressive Enhancement

**Level 1: Basic Integration**

- Simple button + modal
- Basic error handling
- Works without LLM (shows fallback)

**Level 2: Enhanced UX**

- Caching
- Loading skeletons
- Animations
- Copy/export features

**Level 3: Advanced Features**

- Follow-up questions
- Insight history
- Custom prompts
- Export to PDF

## Dependencies

**Minimal Requirements**:

- Fetch API or axios for HTTP requests
- Modal/dialog component from UI library
- Markdown renderer (optional, for formatted text)

**Optional**:

- React Query / SWR (for caching)
- Zustand / Redux (for state management)
- React Markdown / marked (for markdown rendering)

## Implementation Checklist

- [ ] Create API service function (`insightsApi.js`)
- [ ] Create hook/composable (`useInsights.js`)
- [ ] Create Insights Modal component
- [ ] Create context builder helpers
- [ ] Add insight button to HourlyEfficiencyHeatmap
- [ ] Add insight button to Sales Summary
- [ ] Add insight button to Customer Segmentation
- [ ] Implement error handling
- [ ] Add loading states
- [ ] Add client-side caching
- [ ] Test with various data types
- [ ] Mobile responsive design
- [ ] Accessibility (ARIA labels, keyboard navigation)

## Future Enhancements

1. **Streaming Responses**: Real-time insight generation
2. **Insight History**: Save and view past insights
3. **Custom Questions**: Allow users to ask specific questions
4. **Multi-language Support**: Generate insights in different languages
5. **Export Options**: PDF, CSV, shareable links
6. **Insight Comparison**: Compare insights across time periods
7. **Notifications**: Alert on critical insights

### To-dos

- [ ] Create API service function (src/api/insightsApi.js) for calling POST /api/v1/insights/explain endpoint with error handling and timeout
- [ ] Create React hook or Vue composable (useInsights) for managing insights state (loading, error, insights data)
- [ ] Create generic InsightsModal component to display explanation, key points, recommendations, and statistics with loading/error states
- [ ] Create helper utilities (insightContexts.js) to build context objects for different data types (hourly_efficiency, sales_summary, customer_segmentation)
- [ ] Add AI Insights button to HourlyEfficiencyHeatmap component with proper context and modal integration
- [ ] Add AI Insights button to Sales Summary component/dashboard
- [ ] Add AI Insights button to Customer Segmentation component
- [ ] Implement client-side caching for insights (cache by data hash, 5-10 min TTL, invalidate on refresh)
- [ ] Implement comprehensive error handling (network errors, timeouts, LLM not configured, validation errors) with user-friendly messages
- [ ] Add loading states (button spinner, modal skeleton, progress indicators)
- [ ] Ensure InsightsModal is mobile-responsive and accessible (ARIA labels, keyboard navigation)
- [ ] Create tests for API service, hooks/composables, and modal component with mocked API responses