from enum import Enum


class LeaveStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    REVOKED = "REVOKED"


class LeaveDayType(str, Enum):
    FULL_DAY = "FULL_DAY"
    FIRST_HALF = "FIRST_HALF"
    SECOND_HALF = "SECOND_HALF"
