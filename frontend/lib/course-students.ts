import Course from '@/model/Course';
import Student from '@/model/Student';

export async function getEligibleStudentsForCourse(courseId: string) {
  const course = await Course.findById(courseId).lean();
  if (!course) {
    return null;
  }

  const students = await Student.find({
    academicYear: course.year.toString(),
    semester: course.semester.toString(),
    specialization: { $in: course.specializations },
    isVerified: true,
  })
    .select('_id studentIdNumber name email specialization academicYear semester')
    .sort({ name: 1 })
    .lean();

  return {
    course,
    students,
  };
}
