from sqlalchemy.ext.asyncio import AsyncSession

from models.notification import Notification


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, user_id: int, type: str, message: str) -> Notification:
        notif = Notification(user_id=user_id, type=type, message=message)
        self.db.add(notif)
        await self.db.commit()
        await self.db.refresh(notif)
        return notif

    async def broadcast(self, user_ids: list[int], type: str, message: str) -> list[Notification]:
        notifications = []
        for uid in user_ids:
            n = await self.create(uid, type, message)
            notifications.append(n)
        return notifications
