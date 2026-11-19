"""Institution, district, school, teacher, student and guardian permissions: who may see which learner's data."""
from __future__ import annotations

from typing import Dict, List, Set

ROLES = ("platform_admin", "district_admin", "school_admin", "teacher", "student", "guardian")


class Org:
    def __init__(self) -> None:
        self.school_district: Dict[str, str] = {}
        self.class_school: Dict[str, str] = {}
        self.student_classes: Dict[str, Set[str]] = {}
        self.teacher_classes: Dict[str, Set[str]] = {}
        self.guardian_students: Dict[str, Set[str]] = {}
        self.admin_scope: Dict[str, str] = {}  # user -> "district:<id>" | "school:<id>"

    def can_view_student(self, user: str, role: str, student: str) -> bool:
        if role == "student":
            return user == student
        if role == "guardian":
            return student in self.guardian_students.get(user, set())
        if role == "teacher":
            return bool(self.teacher_classes.get(user, set()) & self.student_classes.get(student, set()))
        if role in ("school_admin", "district_admin"):
            scope = self.admin_scope.get(user, "")
            kind, _, sid = scope.partition(":")
            for c in self.student_classes.get(student, set()):
                school = self.class_school.get(c)
                if (kind == "school" and school == sid) or (kind == "district" and self.school_district.get(school or "") == sid):
                    return True
            return False
        return False  # platform_admin has no default access to learner data: support access is a break-glass procedure

    def visible_students(self, user: str, role: str, students: List[str]) -> List[str]:
        return [s for s in students if self.can_view_student(user, role, s)]
