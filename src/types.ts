export interface Image {
  id: string;
  name: string;
  url: string;
  tags: string[];
  projectId: string;
  metadata?: Record<string, any>;
}

export interface Project {
  id: string;
  name: string;
}
