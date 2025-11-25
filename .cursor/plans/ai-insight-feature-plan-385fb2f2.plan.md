<!-- 385fb2f2-303b-437f-8d1c-6e2842d5711a 988cfd30-8b13-4784-8da4-562471eccf10 -->
# AI Insight Feature Implementation Plan

## Overview

Add an "AI Insight" button to the HourlyEfficiencyHeatmap component that generates automated insights and trend analysis. The button will trigger analysis of the current heatmap data to provide actionable insights, patterns, and recommendations.

## Architecture Decision: Backend Processing

**Recommendation: Backend Processing**

Since you already have:

- LLM infrastructure set up (`/api/ask-seleric/query` endpoint exists)
- Backend at `localhost:8080` (Java/Spring Boot based on API patterns)
- Large data volumes possible (yearly view = 365 days × 24 hours = 8,760 data points)

**Reasons:**

1. **Data Volume**: The frontend already receives aggregated hourly data, but full analysis may require accessing raw data or historical context
2. **LLM Integration**: Existing LLM setup is backend-based (same pattern as AskSeleric)
3. **Performance**: Backend can cache, batch, and optimize LLM calls
4. **Security**: Sensitive data processing stays server-side
5. **Scalability**: Backend can handle multiple concurrent insight requests

**RAG Requirement Assessment:**

- **Not immediately required** for initial implementation
- Simple statistical analysis + LLM summarization should suffice
- Consider RAG later if you need historical context, similar patterns across campaigns, or domain knowledge base

## Implementation Steps

### 1. Frontend: Add AI Insight Button

**File**: `src/components/child/HourlyEfficiencyHeatmap.jsx`

- Add AI Insight button next to the expand button (line ~496)
- Button should be visible in both collapsed and expanded views
- Show loading state when processing
- Display insights in a modal/drawer overlay

**Button Placement**:

```12:14:src/components/child/HourlyEfficiencyHeatmap.jsx
// Add next to expand button around line 496
```

### 2. Frontend: Create Insight Modal Component

**New File**: `src/components/child/HourlyEfficiencyInsightModal.jsx`

- Similar pattern to `AskSelericModal.jsx` but focused on heatmap insights
- Display formatted insights with sections:
  - Key Findings (summary bullets)
  - Trend Analysis (hourly patterns)
  - Recommendations (actionable insights)
  - Statistical Highlights (numbers/percentages)
- Support markdown/rich text formatting
- Loading skeleton during analysis

### 3. Frontend: API Service Method

**File**: `src/api/api.js` or new `src/services/insightApi.js`

- Add method to call backend insight endpoint:
  ```javascript
  getHourlyEfficiencyInsights(startDate, endDate, hourlyData)
  ```

- Include error handling and timeout management
- Follow existing `apiClient` pattern with authentication

### 4. Backend: New API Endpoint

**Endpoint**: `POST /api/v1/marketing/attribution/hourly-spend-sales/insights`

**Request Payload**:

```json
{
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "period": "monthly",
  "data_summary": {
    "total_spend": 10000,
    "total_revenue": 25000,
    "average_roas": 2.5,
    "hourly_data": [...]
  }
}
```

**Response Structure**:

```json
{
  "success": true,
  "insights": {
    "summary": "Overall analysis summary text",
    "findings": [
      {
        "type": "trend|anomaly|recommendation",
        "title": "Peak Performance Hours",
        "description": "Hours 14-17 show consistently high ROAS...",
        "severity": "info|warning|critical",
        "data_points": [...]
      }
    ],
    "trends": {
      "peak_hours": [14, 15, 16, 17],
      "underperforming_hours": [2, 3, 4],
      "day_night_pattern": "details..."
    },
    "recommendations": [
      {
        "action": "Consider pausing ads",
        "hours": [2, 3, 4],
        "reason": "ROAS below 1.0 consistently"
      }
    ],
    "statistics": {
      "best_hour_roas": 3.2,
      "worst_hour_roas": 0.5,
      "avg_roas": 2.1
    }
  },
  "metadata": {
    "analysis_time": "2024-01-15T10:30:00Z",
    "model_version": "gpt-4"
  }
}
```

### 5. Backend: Insight Generation Logic

**Components**:

1. **Statistical Analysis Module**

   - Calculate trends (hourly patterns, day/night differences)
   - Identify anomalies (unusual spikes/drops)
   - Compute averages, peaks, valleys
   - Compare to historical baselines (if available)

2. **LLM Prompt Engineering**

   - Structure prompt with:
     - Data summary (aggregated stats)
     - Hourly data (24-hour breakdown)
     - Context (date range, period type)
     - Request format (JSON structure for insights)
   - Use existing LLM infrastructure (`/api/ask-seleric/query` pattern)
   - Parse LLM response into structured insights

3. **Post-Processing**

   - Validate LLM output structure
   - Enrich with calculated statistics
   - Format recommendations
   - Handle edge cases (no data, insufficient data)

### 6. Insight Types to Generate

1. **Peak Performance Analysis**

   - Identify best performing hours
   - Highlight consistent winners
   - Calculate confidence levels

2. **Underperformance Detection**

   - Flag hours with ROAS < 1.0
   - Identify trends (improving/worsening)
   - Suggest pause opportunities

3. **Pattern Recognition**

   - Day vs night performance
   - Morning vs evening trends
   - Weekday patterns (if multi-day data)

4. **Efficiency Opportunities**

   - Hours to increase bids
   - Hours to reallocate budget
   - Optimization suggestions

5. **Anomaly Detection**

   - Unusual spikes or drops
   - Outlier hours
   - Data quality issues

### 7. Error Handling & Edge Cases

- **No data**: Show friendly message
- **Insufficient data**: Require minimum data points
- **LLM timeout**: Fallback to statistical-only insights
- **API failures**: Retry logic, user-friendly errors
- **Loading states**: Progressive loading indicators

### 8. User Experience Enhancements

- **Caching**: Cache insights for same date range (5-10 min TTL)
- **Progressive disclosure**: Show summary first, expand for details
- **Action buttons**: Link insights to existing pause/increase bid actions
- **Export**: Allow exporting insights as PDF/text
- **Refresh**: Manual refresh button

## Technical Considerations

### Data Privacy

- Only send aggregated data summaries to LLM (not raw transaction data)
- Include date range context but not sensitive details
- Follow existing authentication patterns

### Performance Optimization

- Pre-compute statistics before LLM call
- Use streaming responses if LLM supports it
- Implement request debouncing (prevent rapid clicks)

### Testing Strategy

- Unit tests for statistical calculations
- Integration tests for API endpoint
- Mock LLM responses for consistent testing
- Edge case testing (empty data, single hour, etc.)

## Future Enhancements (Out of Scope)

1. **RAG Integration**: Add historical context and domain knowledge
2. **Comparative Analysis**: Compare across different date ranges
3. **Predictive Insights**: Forecast future performance
4. **Automated Actions**: Auto-pause based on insights
5. **Insight History**: Track insights over time
6. **Multi-Channel Analysis**: Include Google, Meta, Organic together

## Files to Modify/Create

**Frontend:**

- `src/components/child/HourlyEfficiencyHeatmap.jsx` (modify)
- `src/components/child/HourlyEfficiencyInsightModal.jsx` (new)
- `src/services/insightApi.js` (new, optional)

**Backend (Java - to be implemented separately):**

- New controller: `HourlyEfficiencyInsightController.java`
- New service: `HourlyEfficiencyInsightService.java`
- LLM integration: Extend existing LLM service

## Dependencies

**Frontend:**

- Existing: `@iconify/react`, `echarts-for-react`
- No new dependencies required (reuse existing modal patterns)

**Backend:**

- Existing LLM integration
- Statistical libraries (if needed)
- JSON parsing for structured LLM responses