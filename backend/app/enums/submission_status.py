from enum import Enum


class SubmissionStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    OUTDATED = "outdated"
    CANCELLED = "cancelled"

    # dont forget to update also frontend enums

    def __str__(self):
        return self.value
