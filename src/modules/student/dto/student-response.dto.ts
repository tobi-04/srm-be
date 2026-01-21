import { ApiProperty } from "@nestjs/swagger";

export class StudentCourseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  thumbnail?: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  enrolled_at: Date;

  @ApiProperty()
  progress_percent: number;

  @ApiProperty()
  total_lessons: number;

  @ApiProperty()
  completed_lessons: number;

  @ApiProperty()
  is_completed: boolean;

  @ApiProperty()
  last_accessed_at?: Date;
}

export class StudentCoursesResponse {
  @ApiProperty({ type: [StudentCourseDto] })
  data: StudentCourseDto[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class StudentDashboardResponse {
  @ApiProperty()
  student: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };

  @ApiProperty({ type: [StudentCourseDto] })
  recent_courses: StudentCourseDto[];

  @ApiProperty()
  stats: {
    total_courses: number;
    in_progress_courses: number;
    completed_courses: number;
    total_lessons_completed: number;
  };

  @ApiProperty()
  notifications: Array<{
    id: string;
    type: string;
    message: string;
    created_at: Date;
  }>;
}

export class StudentProgressResponse {
  @ApiProperty({ type: [StudentCourseDto] })
  courses: StudentCourseDto[];

  @ApiProperty()
  overall_progress: {
    total_courses: number;
    completed_courses: number;
    completion_rate: number;
    total_lessons: number;
    completed_lessons: number;
  };
}

export class StudentLessonDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  order: number;

  @ApiProperty()
  video_url?: string;

  @ApiProperty()
  video_duration?: number;

  @ApiProperty()
  is_locked: boolean;

  @ApiProperty()
  is_completed: boolean;

  @ApiProperty()
  progress_percent: number;
}

export class StudentCourseDetailResponse {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  thumbnail?: string;

  @ApiProperty()
  enrolled_at: Date;

  @ApiProperty()
  progress_percent: number;

  @ApiProperty({ type: [StudentLessonDto] })
  lessons: StudentLessonDto[];
}
