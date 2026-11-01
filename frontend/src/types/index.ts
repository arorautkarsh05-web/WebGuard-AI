export interface Website {
  id: string;
  name: string;
  url: string;
  health_status: 'healthy' | 'degraded' | 'down' | 'unknown';
  last_response_time_ms?: number;
  last_status_code?: number;
  last_checked_at?: string;
  check_frequency_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface MonitoringTask {
  id: string;
  website_id?: string;
  name: string;
  task_type: 'health_check' | 'change_detection' | 'functional_test' | 'competitor_scan';
  target_url: string;
  schedule_cron?: string;
  status: string;
  config?: Record<string, any>;
  last_run_at?: string;
  created_at: string;
}

export interface MonitoringResult {
  id: string;
  task_id: string;
  website_id?: string;
  status: string;
  response_time_ms?: number;
  http_status_code?: number;
  data?: Record<string, any>;
  error_message?: string;
  created_at: string;
}

export interface Competitor {
  id: string;
  name: string;
  domain: string;
  website_url: string;
  description?: string;
  last_monitored_at?: string;
  created_at: string;
  products?: Product[];
}

export interface Product {
  id: string;
  competitor_id: string;
  name: string;
  url: string;
  current_price?: number;
  currency: string;
  availability_status: string;
  last_scraped_at?: string;
  price_history?: PriceHistory[];
}

export interface PriceHistory {
  id: string;
  price: number;
  currency: string;
  availability: boolean;
  promotional_details?: string;
  captured_at: string;
}

export interface Incident {
  id: string;
  website_id?: string;
  task_id?: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  status: 'Open' | 'Investigating' | 'Resolved' | 'False_Positive';
  root_cause_summary?: string;
  evidence?: Record<string, any>;
  recommended_actions?: string[];
  created_at: string;
  resolved_at?: string;
}

export interface TinyFishExecution {
  id: string;
  service_type: string;
  endpoint: string;
  request_params?: Record<string, any>;
  response_status?: number;
  execution_time_ms?: number;
  status: string;
  response_summary?: Record<string, any>;
  created_at: string;
}

export interface DashboardOverview {
  total_websites: number;
  healthy_websites: number;
  degraded_websites: number;
  down_websites: number;
  active_monitoring_tasks: number;
  competitors_monitored: number;
  total_changes_detected: number;
  critical_incidents: number;
  open_incidents: number;
  uptime_percentage: number;
  average_response_time_ms: number;
}

export interface DashboardActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  severity?: string;
  timestamp: string;
}

