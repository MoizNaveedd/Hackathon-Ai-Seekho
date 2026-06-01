"""Agent 4 - Follow-Up: schedules post-booking reminders."""

from .common import AgentExecutionLog


class FollowUpAgent:
    def __init__(self):
        self.name = "Follow-Up Agent"

    def process(self, booking_data: dict, language: str, logger: AgentExecutionLog):
        if booking_data.get("status") != "confirmed":
            return {"follow_up": None}
        result = {"follow_up_scheduled": True, "reminder": "1 hour before appointment"}
        logger.add_log(self.name, "Reminder Scheduled", result)
        return result
