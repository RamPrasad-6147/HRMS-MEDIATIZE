from enum import Enum


class AnnouncementScope(str, Enum):
    COMPANY = "COMPANY"
    PROJECT = "PROJECT"


class AnnouncementType(str, Enum):
    HOLIDAY = "HOLIDAY"
    SALARY = "SALARY"
    HR_NOTICE = "HR_NOTICE"
    COMPANY_UPDATE = "COMPANY_UPDATE"
    GENERAL = "GENERAL"


class AnnouncementPriority(str, Enum):
    NORMAL = "NORMAL"
    IMPORTANT = "IMPORTANT"
    URGENT = "URGENT"


class AnnouncementStatus(str, Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"
