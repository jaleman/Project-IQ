export type UserRole = "admin" | "leader" | "member";
export type TaskStatus = "planned" | "pending" | "in_progress" | "done" | "archived";
export type ProjectStatus = "active" | "on_hold" | "completed";
export type FeedbackType = "bug_report" | "feature_request" | "comment" | "other";
export type AssignmentStatus = "planned" | "active" | "on_hold" | "completed";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  availability: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Event {
  id: number;
  title: string;
  date: string;
  required_staff: number;
  created_by: number;
}

export interface Task {
  id: number;
  user_id: number;
  project_id: number | null;
  title: string;
  notes: string | null;
  status: TaskStatus;
  is_private: boolean;
  shared_with: string | null;
  start_date: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  created_at: string;
}

export interface Assignment {
  id: number;
  user_id: number;
  task_id: number;
  start_date: string;
  end_date: string | null;
  allocation_pct: number;
  status: AssignmentStatus;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  message: string;
  read: boolean;
  archived: boolean;
  task_id: number | null;
  task_status: TaskStatus | null;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T;
  error: string | null;
  status: number;
}

export interface ProjectTaskOut {
  id: number;
  title: string;
  notes: string | null;
  status: TaskStatus;
  user_id: number;
  user_name: string;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_by: number;
  created_at: string;
}

export interface Feedback {
  id: number;
  user_id: number;
  user_name: string;
  type: FeedbackType;
  notes: string;
  reply: string | null;
  replied_at: string | null;
  done: boolean;
  created_at: string;
}

export interface ProjectDetail extends Project {
  tasks: ProjectTaskOut[];
}
