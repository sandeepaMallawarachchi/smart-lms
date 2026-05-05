from __future__ import annotations

import copy
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from pymongo import MongoClient


DB_NAME = os.getenv("MONGO_DB_NAME", "test")

# Real course IDs currently in the live database. These match the active
# Year 4 / Semester 1 / SE coursework we want the demo students to share.
COURSE_SECURE_SOFTWARE = "6959521cc6dca6755bc908de"
COURSE_ROBOTICS = "6959eb93aecdd635139e33e9"
TARGET_COURSE_IDS = [COURSE_SECURE_SOFTWARE, COURSE_ROBOTICS]

# Four real student accounts we will shape into a realistic comparative cohort.
TARGET_STUDENTS = {
    "69512b8890017584e2dd15e8": {
        "band": "good",
        "studentIdNumber": "it22156938",
        "name": "Nipuna Sudaraka",
        "email": "it22156938@my.sliit.lk",
    },
    "6958a0c6dec3de3cf9d21554": {
        "band": "bad",
        "studentIdNumber": "it22552242",
        "name": "Sandeepa Mallawarachchi",
        "email": "it22552242@my.sliit.lk",
    },
    "695a191c9f4b9a02012f6634": {
        "band": "normal",
        "studentIdNumber": "it22586766",
        "name": "Sachini Dilrangi",
        "email": "it22586766@my.sliit.lk",
    },
    "69aad7a7058433aa470dd236": {
        "band": "very_good",
        "studentIdNumber": "it22066534",
        "name": "Tashini Hansanee",
        "email": "it22066534@my.sliit.lk",
    },
}

GROUP_PROJECT_NAME = "shopping website"
GROUP_BLUEPRINTS = [
    ("SSD-Team-Alpha", ["69512b8890017584e2dd15e8", "695a191c9f4b9a02012f6634"]),
    ("SSD-Team-Beta", ["6958a0c6dec3de3cf9d21554", "69aad7a7058433aa470dd236"]),
]


@dataclass(frozen=True)
class BandProfile:
    risk_curve: list[float]
    score_curve: list[float]
    completion_curve: list[float]
    clicks_curve: list[int]
    late_curve: list[int]
    explanation: str
    motivation: str
    actions: list[str]
    risk_factors: list[str]
    goals: list[dict[str, Any]]
    done_ratio: float
    inprogress_ratio: float
    overdue_incomplete_ratio: float


BAND_PROFILES: dict[str, BandProfile] = {
    "very_good": BandProfile(
        risk_curve=[0.26, 0.22, 0.19, 0.16, 0.14, 0.13, 0.11, 0.09],
        score_curve=[78, 80, 82, 84, 85, 87, 89, 91],
        completion_curve=[0.72, 0.78, 0.82, 0.86, 0.9, 0.93, 0.95, 0.97],
        clicks_curve=[1800, 2100, 2400, 2750, 3050, 3300, 3550, 3850],
        late_curve=[1, 1, 0, 0, 0, 0, 0, 0],
        explanation="Consistently high engagement, timely submissions, and strong assessment performance indicate a low academic risk.",
        motivation="You are building strong momentum. Keep stretching into advanced tasks while maintaining your current consistency.",
        actions=[
            "Continue weekly revision immediately after lectures.",
            "Reserve one focused lab block each week for secure coding practice.",
            "Review robotics deliverables early and keep buffer time before deadlines.",
        ],
        risk_factors=["No major academic risk detected", "Only minor workload spikes near deadlines"],
        goals=[
            {
                "title": "Complete the robotics mini tasks ahead of schedule",
                "description": "Maintain early completion on robotics practical work to preserve a strong performance trend.",
                "category": "academic",
                "priority": "medium",
                "status": "inprogress",
                "milestones": [
                    "Finish Robot Perception notes review",
                    "Test movement algorithms one week early",
                    "Submit the next robotics task 48 hours before deadline",
                ],
                "tags": ["robotics", "planning", "consistency"],
            },
            {
                "title": "Build a polished secure coding portfolio piece",
                "description": "Turn one secure software task into a showcase-quality project with documentation and testing evidence.",
                "category": "project",
                "priority": "high",
                "status": "todo",
                "milestones": [
                    "Pick the best secure software task",
                    "Add README and threat summary",
                    "Record validation screenshots and test notes",
                ],
                "tags": ["portfolio", "security", "project"],
            },
            {
                "title": "Strengthen interview-ready security explanations",
                "description": "Practice explaining core secure development concepts clearly for placements and evaluations.",
                "category": "career",
                "priority": "medium",
                "status": "done",
                "milestones": [
                    "Summarize SQL injection prevention",
                    "Explain access-control patterns",
                    "Prepare one SSDLC case study example",
                ],
                "tags": ["career", "security", "communication"],
            },
        ],
        done_ratio=0.82,
        inprogress_ratio=0.14,
        overdue_incomplete_ratio=0.02,
    ),
    "good": BandProfile(
        risk_curve=[0.38, 0.34, 0.3, 0.28, 0.25, 0.23, 0.21, 0.19],
        score_curve=[67, 69, 71, 73, 74, 76, 78, 80],
        completion_curve=[0.58, 0.64, 0.68, 0.72, 0.76, 0.8, 0.84, 0.87],
        clicks_curve=[1250, 1500, 1700, 1900, 2150, 2350, 2550, 2750],
        late_curve=[2, 2, 1, 1, 1, 1, 0, 0],
        explanation="Performance is stable with healthy improvement, though a few deadline delays and uneven activity still create mild risk.",
        motivation="You are close to a strong-performing profile. Better deadline discipline and steadier revision will move you there.",
        actions=[
            "Close overdue work before starting new tasks.",
            "Review one secure software concept after each practical session.",
            "Use a fixed weekly checklist for project milestones.",
        ],
        risk_factors=["A few late submissions", "Engagement varies between weeks"],
        goals=[
            {
                "title": "Reduce late submissions in secure software tasks",
                "description": "Improve consistency by completing high-effort security tasks with a 24-hour buffer.",
                "category": "academic",
                "priority": "high",
                "status": "inprogress",
                "milestones": [
                    "Plan the week around the next two deadlines",
                    "Finish first draft one day early",
                    "Use a final review checklist before submission",
                ],
                "tags": ["deadlines", "secure-software", "discipline"],
            },
            {
                "title": "Improve practical confidence in robotics",
                "description": "Build more confidence by revisiting robot movement and sensor logic in short practice sessions.",
                "category": "skill",
                "priority": "medium",
                "status": "todo",
                "milestones": [
                    "Review the last lab sheet",
                    "Practice one robotics concept this week",
                    "Document common implementation mistakes",
                ],
                "tags": ["robotics", "practice", "skills"],
            },
            {
                "title": "Maintain a steady weekly study rhythm",
                "description": "Create a repeatable schedule that keeps coursework from bunching up near deadlines.",
                "category": "personal",
                "priority": "medium",
                "status": "todo",
                "milestones": [
                    "Set two fixed evening study slots",
                    "Track weekly task completion",
                    "Review unfinished work every Sunday",
                ],
                "tags": ["routine", "planning", "study"],
            },
        ],
        done_ratio=0.62,
        inprogress_ratio=0.24,
        overdue_incomplete_ratio=0.06,
    ),
    "normal": BandProfile(
        risk_curve=[0.56, 0.54, 0.53, 0.51, 0.5, 0.49, 0.48, 0.46],
        score_curve=[55, 58, 59, 61, 63, 64, 66, 68],
        completion_curve=[0.42, 0.47, 0.51, 0.55, 0.58, 0.61, 0.64, 0.68],
        clicks_curve=[760, 900, 1020, 1150, 1260, 1400, 1520, 1650],
        late_curve=[4, 3, 3, 3, 2, 2, 2, 2],
        explanation="The student is managing some coursework but still shows moderate risk due to inconsistent completion and variable marks.",
        motivation="A few focused improvements will noticeably change your results. Regular completion matters more than last-minute bursts.",
        actions=[
            "Complete smaller pending tasks before tackling large projects.",
            "Ask for help on topics that repeatedly appear in feedback.",
            "Track progress visibly so unfinished work does not accumulate.",
        ],
        risk_factors=["Moderate completion rate", "Repeated late submissions", "Assessment scores are inconsistent"],
        goals=[
            {
                "title": "Bring pending security tasks back under control",
                "description": "Recover from incomplete secure software activities by finishing the oldest open work first.",
                "category": "academic",
                "priority": "high",
                "status": "todo",
                "milestones": [
                    "List all open security tasks",
                    "Finish the oldest incomplete task",
                    "Submit the next task on time",
                ],
                "tags": ["recovery", "security", "tasks"],
            },
            {
                "title": "Strengthen average score in practical assessments",
                "description": "Improve marks by revisiting missed concepts and testing solutions before submission.",
                "category": "skill",
                "priority": "medium",
                "status": "inprogress",
                "milestones": [
                    "Review feedback from the last two tasks",
                    "Practice one weak topic each week",
                    "Use a self-check before submitting work",
                ],
                "tags": ["marks", "practice", "feedback"],
            },
            {
                "title": "Stabilize weekly engagement",
                "description": "Avoid long inactive gaps by maintaining short but regular study sessions.",
                "category": "personal",
                "priority": "medium",
                "status": "todo",
                "milestones": [
                    "Study in three short sessions each week",
                    "Track activity in a notebook",
                    "Avoid missing two consecutive days",
                ],
                "tags": ["engagement", "routine", "consistency"],
            },
        ],
        done_ratio=0.42,
        inprogress_ratio=0.32,
        overdue_incomplete_ratio=0.12,
    ),
    "bad": BandProfile(
        risk_curve=[0.58, 0.61, 0.64, 0.67, 0.7, 0.73, 0.76, 0.79],
        score_curve=[58, 56, 54, 52, 49, 47, 45, 43],
        completion_curve=[0.55, 0.51, 0.47, 0.43, 0.4, 0.37, 0.34, 0.3],
        clicks_curve=[1100, 980, 860, 760, 680, 610, 540, 480],
        late_curve=[2, 3, 3, 4, 4, 5, 5, 6],
        explanation="The student is currently at high academic risk because completion, marks, and engagement have all declined across recent checkpoints.",
        motivation="Recovery is still possible, but it needs immediate structure. Finishing key overdue work is the highest-value next step.",
        actions=[
            "Meet the lecturer or supervisor this week to review missed work.",
            "Focus on two overdue items instead of trying to fix everything at once.",
            "Use daily short study blocks to rebuild consistency.",
        ],
        risk_factors=["Low completion rate", "Multiple late submissions", "Declining assessment scores", "Low sustained engagement"],
        goals=[
            {
                "title": "Recover overdue secure software coursework",
                "description": "Prioritize overdue work in secure software to stop the risk trend from worsening.",
                "category": "academic",
                "priority": "high",
                "status": "todo",
                "milestones": [
                    "Identify the two highest-impact overdue items",
                    "Finish one overdue item this week",
                    "Check in with the lecturer on remaining work",
                ],
                "tags": ["overdue", "recovery", "security"],
            },
            {
                "title": "Rebuild engagement through short daily sessions",
                "description": "Use manageable daily study blocks to reduce inactivity and improve confidence.",
                "category": "personal",
                "priority": "high",
                "status": "inprogress",
                "milestones": [
                    "Study for 30 minutes on five days this week",
                    "Log each session",
                    "Review one weak topic after each session",
                ],
                "tags": ["engagement", "habit", "recovery"],
            },
            {
                "title": "Improve performance in the next robotics task",
                "description": "Target one upcoming robotics activity as a controlled win to rebuild momentum.",
                "category": "academic",
                "priority": "medium",
                "status": "todo",
                "milestones": [
                    "Read the next robotics task brief early",
                    "Prepare notes before starting implementation",
                    "Ask one clarifying question before submission",
                ],
                "tags": ["robotics", "momentum", "focus"],
            },
        ],
        done_ratio=0.18,
        inprogress_ratio=0.26,
        overdue_incomplete_ratio=0.28,
    ),
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def maybe_parse_date(value: str | None) -> datetime:
    if not value:
        return utc_now()
    return as_utc(datetime.strptime(value, "%Y-%m-%d"))


def normalize(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: normalize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [normalize(v) for v in value]
    return value


def recommendation_payload(profile: BandProfile, generated_at: datetime) -> dict[str, Any]:
    return {
        "explanation": profile.explanation,
        "motivation": profile.motivation,
        "action_steps": profile.actions,
        "model": "seeded-demo-scenario",
        "source": "manual_seed",
        "generated_at": generated_at.isoformat(),
    }


def goal_document(student_id: str, goal: dict[str, Any], target_date: datetime, created_at: datetime) -> dict[str, Any]:
    status = goal["status"]
    progress = 100 if status == "done" else 50 if status == "inprogress" else 0
    completed_at = created_at + timedelta(days=7) if status == "done" else None
    return {
        "studentId": student_id,
        "title": goal["title"],
        "description": goal["description"],
        "category": goal["category"],
        "targetDate": target_date,
        "priority": goal["priority"],
        "status": status,
        "progress": progress,
        "milestones": [
            {
                "id": f"m{i+1}",
                "title": title,
                "completed": status == "done" or (status == "inprogress" and i == 0),
                "completedAt": completed_at if (status == "done" or (status == "inprogress" and i == 0)) else None,
            }
            for i, title in enumerate(goal["milestones"])
        ],
        "tags": goal["tags"],
        "completedAt": completed_at,
        "createdAt": created_at,
        "updatedAt": utc_now(),
    }


def clone_main_tasks(main_tasks: list[dict[str, Any]], status: str) -> list[dict[str, Any]]:
    cloned: list[dict[str, Any]] = []
    for task_index, task in enumerate(main_tasks):
        task_copy = {
            "id": task.get("id") or f"mt-{task_index + 1}",
            "title": task.get("title", f"Main Task {task_index + 1}"),
            "description": task.get("description", ""),
            "marks": float(task.get("marks", 0) or 0),
            "completed": status == "done",
            "subtasks": [],
        }
        subtasks = task.get("subtasks", [])
        if status == "inprogress":
            task_copy["completed"] = False
        for subtask_index, subtask in enumerate(subtasks):
            completed = status == "done"
            if status == "inprogress":
                completed = subtask_index < max(1, len(subtasks) // 2)
            task_copy["subtasks"].append(
                {
                    "id": subtask.get("id") or f"st-{task_index + 1}-{subtask_index + 1}",
                    "title": subtask.get("title", f"Subtask {subtask_index + 1}"),
                    "description": subtask.get("description", ""),
                    "marks": float(subtask.get("marks", 0) or 0),
                    "completed": completed,
                }
            )
        if status == "inprogress" and task_copy["subtasks"]:
            task_copy["completed"] = all(st["completed"] for st in task_copy["subtasks"])
        cloned.append(task_copy)
    return cloned


def clone_subtasks(subtasks: list[dict[str, Any]], status: str) -> list[dict[str, Any]]:
    cloned: list[dict[str, Any]] = []
    for index, subtask in enumerate(subtasks):
        completed = status == "done"
        if status == "inprogress":
            completed = index < max(1, len(subtasks) // 2)
        cloned.append(
            {
                "id": subtask.get("id") or f"st-{index + 1}",
                "title": subtask.get("title", f"Subtask {index + 1}"),
                "description": subtask.get("description", ""),
                "marks": float(subtask.get("marks", 0) or 0),
                "completed": completed,
            }
        )
    return cloned


def choose_statuses(items: list[dict[str, Any]], profile: BandProfile) -> list[str]:
    total = len(items)
    done_cutoff = round(total * profile.done_ratio)
    inprogress_cutoff = round(total * (profile.done_ratio + profile.inprogress_ratio))
    overdue_cutoff = round(total * profile.overdue_incomplete_ratio)

    statuses: list[str] = []
    for index, item in enumerate(items):
        deadline = maybe_parse_date(item.get("deadlineDate"))
        overdue = deadline < utc_now()
        if index < done_cutoff:
            statuses.append("done")
        elif index < inprogress_cutoff:
            statuses.append("inprogress")
        elif overdue and (index - inprogress_cutoff) < overdue_cutoff:
            statuses.append("todo")
        else:
            statuses.append("todo")
    return statuses


def seed_predictions(student_id: str, student_no: str, profile: BandProfile) -> list[dict[str, Any]]:
    highest_education = "A Level or Equivalent"
    disability = "N"
    gender = "F" if student_no in {"it22586766", "it22066534"} else "M"
    age_band = "0-35"
    generated: list[dict[str, Any]] = []
    base_date = as_utc(datetime(2026, 3, 10, 9, 0, 0))

    for idx, risk_probability in enumerate(profile.risk_curve):
        created_at = base_date + timedelta(days=7 * idx)
        avg_score = profile.score_curve[idx]
        completion_rate = profile.completion_curve[idx]
        total_clicks = profile.clicks_curve[idx]
        late_submissions = profile.late_curve[idx]

        if risk_probability >= 0.7:
            risk_level = "high"
        elif risk_probability >= 0.4:
            risk_level = "medium"
        else:
            risk_level = "low"

        input_data = {
            "total_clicks": total_clicks,
            "avg_clicks_per_day": round(total_clicks / 75, 2),
            "clicks_std": round(total_clicks * 0.11, 2),
            "max_clicks_single_day": max(15, round(total_clicks / 12)),
            "days_active": max(18, round(35 + idx * 4 + completion_rate * 25)),
            "study_span_days": 90 + idx * 4,
            "engagement_regularity": round(1.8 - completion_rate if risk_level != "high" else 1.8 + risk_probability, 2),
            "pre_course_clicks": max(0, round(total_clicks * 0.04)),
            "avg_score": avg_score,
            "score_std": round(6 + (1 - completion_rate) * 10, 2),
            "min_score": max(20, round(avg_score - 18)),
            "max_score": min(100, round(avg_score + 10)),
            "completion_rate": completion_rate,
            "first_score": max(20, round(avg_score - 4)),
            "score_improvement": round(2 + idx * 0.8 if risk_level != "high" else max(-6, 2 - idx), 1),
            "avg_days_early": round(2.8 - late_submissions * 0.9, 2),
            "timing_consistency": round(2.5 + late_submissions * 0.7, 2),
            "worst_delay": -late_submissions if late_submissions > 0 else 2,
            "late_submission_count": late_submissions,
            "num_of_prev_attempts": 0 if risk_level == "low" else 1,
            "studied_credits": 7,
            "early_registration": 1 if risk_level != "high" else 0,
            "withdrew": 0,
            "gender": gender,
            "age_band": age_band,
            "highest_education": highest_education,
            "disability": disability,
        }

        confidence = round(min(0.95, 0.58 + abs(risk_probability - 0.5)), 3)

        generated.append(
            {
                "studentId": student_id,
                "studentIdNumber": student_no,
                "inputData": input_data,
                "prediction": {
                    "at_risk": risk_level in {"medium", "high"},
                    "confidence": confidence,
                    "risk_level": risk_level,
                    "risk_probability": risk_probability,
                    "risk_factors": profile.risk_factors,
                },
                "recommendations": recommendation_payload(profile, created_at),
                "apiTimestamp": created_at.isoformat(),
                "semester": "1",
                "academicYear": "4",
                "specialization": "SE",
                "createdAt": created_at,
                "updatedAt": created_at,
            }
        )
    return generated


def build_project_progress(student_id: str, project: dict[str, Any], status: str, updated_at: datetime) -> dict[str, Any]:
    return {
        "studentId": student_id,
        "projectId": str(project["_id"]),
        "status": status,
        "mainTasks": clone_main_tasks(project.get("mainTasks", []), status),
        "createdAt": updated_at - timedelta(days=5),
        "updatedAt": updated_at,
    }


def build_task_progress(student_id: str, task: dict[str, Any], status: str, updated_at: datetime) -> dict[str, Any]:
    return {
        "studentId": student_id,
        "taskId": str(task["_id"]),
        "status": status,
        "subtasks": clone_subtasks(task.get("subtasks", []), status),
        "createdAt": updated_at - timedelta(days=3),
        "updatedAt": updated_at,
    }


def main() -> None:
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri:
        raise RuntimeError("MONGODB_URI is required")

    client = MongoClient(mongo_uri)
    db = client[DB_NAME]
    timestamp = utc_now()
    backup_collection = db[f"seed_backups_{timestamp.strftime('%Y%m%d_%H%M%S')}"]

    students_col = db["students"]
    predictions_col = db["predictions"]
    goals_col = db["learninggoals"]
    project_progress_col = db["studentprojectprogresses"]
    task_progress_col = db["studenttaskprogresses"]
    projects_col = db["projects"]
    tasks_col = db["tasks"]
    groups_col = db["coursegroups"]

    student_ids = list(TARGET_STUDENTS.keys())
    students = list(students_col.find({"_id": {"$in": [ObjectId(sid) for sid in student_ids]}}))
    found_ids = {str(student["_id"]) for student in students}
    missing = set(student_ids) - found_ids
    if missing:
        raise RuntimeError(f"Missing target students: {sorted(missing)}")

    # Backup current records before rewriting the demo cohort.
    for collection_name, query in [
        ("students", {"_id": {"$in": [student["_id"] for student in students]}}),
        ("predictions", {"studentId": {"$in": student_ids}}),
        ("learninggoals", {"studentId": {"$in": student_ids}}),
        ("studentprojectprogresses", {"studentId": {"$in": student_ids}}),
        ("studenttaskprogresses", {"studentId": {"$in": student_ids}}),
        ("coursegroups", {"studentIds": {"$in": student_ids}}),
    ]:
        docs = list(db[collection_name].find(query))
        if docs:
            backup_collection.insert_many(
                [
                    {
                        "sourceCollection": collection_name,
                        "capturedAt": timestamp,
                        "document": normalize(copy.deepcopy(doc)),
                    }
                    for doc in docs
                ]
            )

    # Standardize the four demo students into the same cohort.
    for student_id, meta in TARGET_STUDENTS.items():
        students_col.update_one(
            {"_id": ObjectId(student_id)},
            {
                "$set": {
                    "studentIdNumber": meta["studentIdNumber"],
                    "name": meta["name"],
                    "email": meta["email"].lower(),
                    "academicYear": "4",
                    "semester": "1",
                    "specialization": "SE",
                    "isVerified": True,
                    "updatedAt": timestamp,
                }
            },
        )

    # Remove old seeded data for the four targeted students.
    predictions_col.delete_many({"studentId": {"$in": student_ids}})
    goals_col.delete_many({"studentId": {"$in": student_ids}})
    project_progress_col.delete_many({"studentId": {"$in": student_ids}})
    task_progress_col.delete_many({"studentId": {"$in": student_ids}})
    groups_col.delete_many({"createdBy": "demo-seed-script", "courseId": {"$in": TARGET_COURSE_IDS}})

    published_projects = list(
        projects_col.find(
            {
                "courseId": {"$in": TARGET_COURSE_IDS},
                "isPublished": {"$ne": False},
            }
        ).sort("deadlineDate", 1)
    )
    published_tasks = list(
        tasks_col.find(
            {
                "courseId": {"$in": TARGET_COURSE_IDS},
                "isPublished": {"$ne": False},
            }
        ).sort("deadlineDate", 1)
    )

    # Create fresh course groups for the visible group project.
    shopping_project = next(
        (project for project in published_projects if project.get("projectName", "").strip().lower() == GROUP_PROJECT_NAME),
        None,
    )
    group_ids: list[str] = []
    if shopping_project:
        for group_name, members in GROUP_BLUEPRINTS:
            doc = {
                "courseId": shopping_project["courseId"],
                "groupName": group_name,
                "studentIds": members,
                "createdBy": "demo-seed-script",
                "isArchived": False,
                "createdAt": timestamp,
                "updatedAt": timestamp,
            }
            result = groups_col.insert_one(doc)
            group_ids.append(str(result.inserted_id))
        projects_col.update_one(
            {"_id": shopping_project["_id"]},
            {"$set": {"assignedGroupIds": group_ids, "updatedAt": timestamp}},
        )

    for student_id, meta in TARGET_STUDENTS.items():
        profile = BAND_PROFILES[meta["band"]]
        predictions = seed_predictions(student_id, meta["studentIdNumber"], profile)
        predictions_col.insert_many(predictions)

        goals: list[dict[str, Any]] = []
        for index, goal in enumerate(profile.goals):
            target_date = timestamp + timedelta(days=14 + index * 10)
            created_at = timestamp - timedelta(days=24 - index * 5)
            goals.append(goal_document(student_id, goal, target_date, created_at))
        if goals:
            goals_col.insert_many(goals)

        project_statuses = choose_statuses(published_projects, profile)
        task_statuses = choose_statuses(published_tasks, profile)

        project_progress_docs = []
        task_progress_docs = []
        for index, project in enumerate(published_projects):
            updated_at = maybe_parse_date(project.get("deadlineDate")) - timedelta(days=1 if project_statuses[index] == "done" else 0)
            if updated_at > timestamp:
                updated_at = timestamp - timedelta(days=max(1, len(published_projects) - index))
            project_progress_docs.append(
                build_project_progress(student_id, project, project_statuses[index], updated_at)
            )
        for index, task in enumerate(published_tasks):
            updated_at = maybe_parse_date(task.get("deadlineDate")) - timedelta(days=1 if task_statuses[index] == "done" else 0)
            if updated_at > timestamp:
                updated_at = timestamp - timedelta(days=max(1, len(published_tasks) - index))
            task_progress_docs.append(
                build_task_progress(student_id, task, task_statuses[index], updated_at)
            )

        if project_progress_docs:
            project_progress_col.insert_many(project_progress_docs)
        if task_progress_docs:
            task_progress_col.insert_many(task_progress_docs)

    summary = {
        "backupsCollection": backup_collection.name,
        "studentsUpdated": len(student_ids),
        "predictionsInserted": predictions_col.count_documents({"studentId": {"$in": student_ids}}),
        "goalsInserted": goals_col.count_documents({"studentId": {"$in": student_ids}}),
        "projectProgressInserted": project_progress_col.count_documents({"studentId": {"$in": student_ids}}),
        "taskProgressInserted": task_progress_col.count_documents({"studentId": {"$in": student_ids}}),
        "courseGroupsInserted": len(group_ids),
    }
    print(summary)


if __name__ == "__main__":
    main()
