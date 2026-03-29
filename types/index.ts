export interface Profile {
  id: string
  display_name: string | null
  location_lat: number | null
  location_lng: number | null
  location_name: string | null
  timezone: string
}

export interface Goal {
  id: string
  user_id: string
  title: string
  description: string | null
  category: 'health' | 'finance' | 'productivity' | 'personal'
  target_value: number | null
  current_value: number
  unit: string | null
  due_date: string | null
  status: 'active' | 'completed' | 'paused'
  created_at: string
  updated_at: string
}

export interface NewsFeed {
  id: string
  user_id: string
  name: string
  url: string
  category: string
  enabled: boolean
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  location?: string
  colorId?: string
  htmlLink?: string
}

export interface Task {
  id: string
  name: string
  status: string
  priority: number | null
  due_date: number | null
  list_name: string
  url: string
  tags: string[]
}

export interface NewsItem {
  id: string
  title: string
  link: string
  source: string
  category: string
  pubDate: string
  summary?: string
}

export interface PlaidAccount {
  id: string
  name: string
  type: string
  subtype: string
  balance: number
  available_balance: number | null
  currency: string
  mask: string
}

export interface HealthMetrics {
  id: string
  user_id: string
  metric_date: string
  source: string
  recovery_score: number | null
  hrv: number | null
  resting_hr: number | null
  sleep_hours: number | null
  sleep_quality: number | null
  strain: number | null
  steps: number | null
  active_calories: number | null
  weight: number | null
  body_fat: number | null
}
