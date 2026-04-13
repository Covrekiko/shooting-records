import { base44 } from '@/api/base44Client';

export const analytics = {
  // Track page views
  trackPageView: (pageName) => {
    base44.analytics.track({
      eventName: 'page_view',
      properties: { page: pageName, timestamp: Date.now() },
    });
  },

  // Track feature usage
  trackFeatureUsage: (featureName, metadata = {}) => {
    base44.analytics.track({
      eventName: 'feature_used',
      properties: { 
        feature: featureName, 
        ...metadata,
        timestamp: Date.now(),
      },
    });
  },

  // Track record creation
  trackRecordCreated: (recordType, recordId) => {
    base44.analytics.track({
      eventName: 'record_created',
      properties: { 
        record_type: recordType, 
        record_id: recordId,
        timestamp: Date.now(),
      },
    });
  },

  // Track check-in
  trackCheckIn: (activityType, locationId) => {
    base44.analytics.track({
      eventName: 'check_in',
      properties: { 
        activity_type: activityType, 
        location_id: locationId,
        timestamp: Date.now(),
      },
    });
  },

  // Track errors
  trackError: (errorName, errorMessage) => {
    base44.analytics.track({
      eventName: 'error_occurred',
      properties: { 
        error_name: errorName, 
        error_message: errorMessage,
        timestamp: Date.now(),
      },
    });
  },

  // Track PDF export
  trackPdfExport: (reportType, recordCount) => {
    base44.analytics.track({
      eventName: 'pdf_exported',
      properties: { 
        report_type: reportType, 
        record_count: recordCount,
        timestamp: Date.now(),
      },
    });
  },

  // Track performance metrics
  trackPerformance: (metricName, duration) => {
    base44.analytics.track({
      eventName: 'performance_metric',
      properties: { 
        metric: metricName, 
        duration_ms: duration,
        timestamp: Date.now(),
      },
    });
  },
};